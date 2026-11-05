import { Ticket } from '../models/Ticket.js';
import { User } from '../models/User.js';
import { AuditLog } from '../models/AuditLog.js';
import { ROLES, TICKET_STATUS, TICKET_PRIORITY } from '../config/constants.js';
import ExcelJS from 'exceljs';
import { stringify } from 'csv-stringify';

/**
 * Sanitizes spreadsheet cells against formula injection (OWASP CSV Injection)
 */
function sanitizeSpreadsheetCell(value) {
  if (typeof value !== 'string') return value;
  if (/^[=+\-@\t\r]/.test(value)) {
    return `'${value}`;
  }
  return value;
}

export async function getOverviewMetrics(req, res, next) {
  try {
    const [
      totalTickets,
      openTickets,
      breachedTickets,
      resolvedTicketsList,
      priorityCounts,
      statusCounts
    ] = await Promise.all([
      Ticket.countDocuments(),
      Ticket.countDocuments({ status: { $in: [TICKET_STATUS.NEW, TICKET_STATUS.OPEN, TICKET_STATUS.ASSIGNED, TICKET_STATUS.IN_PROGRESS, TICKET_STATUS.PENDING_USER] } }),
      Ticket.countDocuments({ isBreached: true }),
      Ticket.find({ status: { $in: [TICKET_STATUS.RESOLVED, TICKET_STATUS.CLOSED] }, resolvedAt: { $ne: null } })
        .select('createdAt resolvedAt totalPausedDurationMs'),
      Ticket.aggregate([
        { $group: { _id: '$priority', count: { $sum: 1 } } }
      ]),
      Ticket.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ])
    ]);

    // Calculate Mean Time to Resolve (MTTR) in hours
    let mttrHours = 0;
    if (resolvedTicketsList.length > 0) {
      const totalResolveDurationMs = resolvedTicketsList.reduce((acc, t) => {
        const duration = (new Date(t.resolvedAt).getTime() - new Date(t.createdAt).getTime()) - (t.totalPausedDurationMs || 0);
        return acc + Math.max(0, duration);
      }, 0);
      mttrHours = parseFloat((totalResolveDurationMs / (resolvedTicketsList.length * 1000 * 60 * 60)).toFixed(2));
    }

    const breachPercentage = totalTickets > 0
      ? parseFloat(((breachedTickets / totalTickets) * 100).toFixed(1))
      : 0;

    res.status(200).json({
      success: true,
      data: {
        summary: {
          totalTickets,
          openTickets,
          breachedTickets,
          breachPercentage,
          mttrHours
        },
        priorityBreakdown: priorityCounts.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        statusBreakdown: statusCounts.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {})
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function getTechnicianWorkload(req, res, next) {
  try {
    const technicians = await User.find({
      role: { $in: [ROLES.TECHNICIAN, ROLES.ADMINISTRATOR] },
      isActive: true
    }).select('name email avatarUrl department skills');

    const workloadCounts = await Ticket.aggregate([
      {
        $match: {
          assignedTechnicianId: { $ne: null },
          status: { $nin: [TICKET_STATUS.RESOLVED, TICKET_STATUS.CLOSED, TICKET_STATUS.CANCELLED] }
        }
      },
      {
        $group: {
          _id: '$assignedTechnicianId',
          activeTickets: { $sum: 1 }
        }
      }
    ]);

    const workloadMap = workloadCounts.reduce((acc, item) => {
      acc[item._id.toString()] = item.activeTickets;
      return acc;
    }, {});

    const technicianWorkload = technicians.map(tech => ({
      _id: tech._id,
      name: tech.name,
      email: tech.email,
      department: tech.department,
      skills: tech.skills,
      activeTickets: workloadMap[tech._id.toString()] || 0
    }));

    res.status(200).json({
      success: true,
      data: { technicians: technicianWorkload }
    });
  } catch (error) {
    next(error);
  }
}

export async function exportCsv(req, res, next) {
  try {
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="helpdesk_hub_tickets.csv"');

    const stringifier = stringify({
      header: true,
      columns: [
        { key: 'ticketNumber', header: 'Ticket Number' },
        { key: 'title', header: 'Title' },
        { key: 'priority', header: 'Priority' },
        { key: 'status', header: 'Status' },
        { key: 'requester', header: 'Requester' },
        { key: 'assignee', header: 'Assignee' },
        { key: 'isBreached', header: 'SLA Breached' },
        { key: 'createdAt', header: 'Created At' },
        { key: 'resolvedAt', header: 'Resolved At' }
      ]
    });

    stringifier.pipe(res);

    const cursor = Ticket.find()
      .populate('requesterId', 'name email')
      .populate('assignedTechnicianId', 'name email')
      .cursor();

    for await (const ticket of cursor) {
      stringifier.write({
        ticketNumber: sanitizeSpreadsheetCell(ticket.ticketNumber),
        title: sanitizeSpreadsheetCell(ticket.title),
        priority: ticket.priority,
        status: ticket.status,
        requester: sanitizeSpreadsheetCell(ticket.requesterId?.name || 'Unknown'),
        assignee: sanitizeSpreadsheetCell(ticket.assignedTechnicianId?.name || 'Unassigned'),
        isBreached: ticket.isBreached ? 'Yes' : 'No',
        createdAt: ticket.createdAt.toISOString(),
        resolvedAt: ticket.resolvedAt ? ticket.resolvedAt.toISOString() : ''
      });
    }

    stringifier.end();
  } catch (error) {
    next(error);
  }
}

export async function exportExcel(req, res, next) {
  try {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'HelpDesk Hub Enterprise ITSM';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Tickets Master', {
      views: [{ state: 'frozen', ySplit: 1 }]
    });

    sheet.columns = [
      { header: 'Ticket Number', key: 'ticketNumber', width: 16 },
      { header: 'Title', key: 'title', width: 35 },
      { header: 'Priority', key: 'priority', width: 12 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Requester', key: 'requester', width: 22 },
      { header: 'Assignee', key: 'assignee', width: 22 },
      { header: 'SLA Breached', key: 'isBreached', width: 14 },
      { header: 'Created Date', key: 'createdAt', width: 20 },
      { header: 'Resolved Date', key: 'resolvedAt', width: 20 }
    ];

    // Style header row
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E40AF' } // Deep Royal Blue
    };

    const tickets = await Ticket.find()
      .sort({ createdAt: -1 })
      .populate('requesterId', 'name')
      .populate('assignedTechnicianId', 'name');

    for (const ticket of tickets) {
      sheet.addRow({
        ticketNumber: sanitizeSpreadsheetCell(ticket.ticketNumber),
        title: sanitizeSpreadsheetCell(ticket.title),
        priority: ticket.priority,
        status: ticket.status,
        requester: sanitizeSpreadsheetCell(ticket.requesterId?.name || 'Unknown'),
        assignee: sanitizeSpreadsheetCell(ticket.assignedTechnicianId?.name || 'Unassigned'),
        isBreached: ticket.isBreached ? 'Yes' : 'No',
        createdAt: ticket.createdAt.toISOString().replace('T', ' ').substring(0, 19),
        resolvedAt: ticket.resolvedAt ? ticket.resolvedAt.toISOString().replace('T', ' ').substring(0, 19) : ''
      });
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="helpdesk_hub_analytics.xlsx"');

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    next(error);
  }
}

export async function getAuditLogs(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 25));
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.action) filter.action = req.query.action;
    if (req.query.entityType) filter.entityType = req.query.entityType;

    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .populate('performedBy', 'name email role'),
      AuditLog.countDocuments(filter)
    ]);

    res.status(200).json({
      success: true,
      data: {
        logs,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
}
