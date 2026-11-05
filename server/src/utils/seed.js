import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { Category } from '../models/Category.js';
import { SLAPolicy } from '../models/SLAPolicy.js';
import { Ticket } from '../models/Ticket.js';
import { Comment } from '../models/Comment.js';
import { Counter } from '../models/Counter.js';
import { AuditLog } from '../models/AuditLog.js';
import { connectDB, disconnectDB } from '../config/db.js';
import { ROLES, TICKET_STATUS, TICKET_PRIORITY, DEFAULT_SLA_POLICIES } from '../config/constants.js';
import { calculateTicketDeadlines } from '../services/slaEngine.js';

export async function seedDatabase() {
  console.log('Seeding HelpDesk Hub Database with Enterprise ITSM Fixtures...');
  await connectDB();

  // 1. Clear existing fixtures
  await Promise.all([
    User.deleteMany({}),
    Category.deleteMany({}),
    SLAPolicy.deleteMany({}),
    Ticket.deleteMany({}),
    Comment.deleteMany({}),
    Counter.deleteMany({}),
    AuditLog.deleteMany({})
  ]);

  // 2. Seed SLA Policies
  console.log('Creating default SLA policies...');
  const slaPolicies = await Promise.all(
    Object.entries(DEFAULT_SLA_POLICIES).map(([priority, config]) =>
      SLAPolicy.create({
        name: `Standard ${priority} SLA Policy`,
        priority,
        firstResponseMinutes: config.firstResponseMinutes,
        resolutionHours: config.resolutionHours,
        escalationThresholdPercent: config.escalationThresholdPercent
      })
    )
  );

  const slaPolicyMap = slaPolicies.reduce((acc, p) => {
    acc[p.priority] = p._id;
    return acc;
  }, {});

  // 3. Seed Categories
  console.log('Creating IT categories & taxonomies...');
  const categories = await Promise.all([
    Category.create({
      name: 'Hardware & Workstations',
      description: 'Laptops, desktops, displays, docking stations and physical peripherals',
      subcategories: ['Laptop Display', 'RAM Failure', 'Docking Station', 'Battery Replacement'],
      defaultPriority: TICKET_PRIORITY.HIGH
    }),
    Category.create({
      name: 'Network & Infrastructure',
      description: 'Corporate VPN, office Wi-Fi, LAN switches, firewall and DNS services',
      subcategories: ['VPN Gateway', 'Switch Outage', 'Wi-Fi AP Failure', 'DNS Resolution'],
      defaultPriority: TICKET_PRIORITY.CRITICAL
    }),
    Category.create({
      name: 'Cloud & DevOps Platforms',
      description: 'AWS, Azure, Docker, Kubernetes clusters, and CI/CD pipelines',
      subcategories: ['AWS IAM Policy', 'Runner Outage', 'Cluster Deployment'],
      defaultPriority: TICKET_PRIORITY.HIGH
    }),
    Category.create({
      name: 'Software Applications & Licensing',
      description: 'Microsoft 365, Slack, ERP system access, software license distribution',
      subcategories: ['Outlook Sync', 'License Key Request', 'ERP Permission'],
      defaultPriority: TICKET_PRIORITY.MEDIUM
    })
  ]);

  // 4. Seed Users
  console.log('Creating initial personas & test accounts...');
  const salt = await bcrypt.genSalt(12);

  const adminUser = await User.create({
    name: 'Sarah Connor (IT Director)',
    email: 'admin@helpdeskhub.internal',
    passwordHash: await bcrypt.hash('AdminPass123!', salt),
    role: ROLES.ADMINISTRATOR,
    department: 'IT Operations',
    phone: '+1 (555) 019-2831'
  });

  const techUser1 = await User.create({
    name: 'Alex Rivera (Senior Systems Engineer)',
    email: 'tech@helpdeskhub.internal',
    passwordHash: await bcrypt.hash('TechPass123!', salt),
    role: ROLES.TECHNICIAN,
    department: 'Infrastructure Support',
    skills: ['Network & Infrastructure', 'Hardware & Workstations']
  });

  const techUser2 = await User.create({
    name: 'Elena Rostova (Cloud Ops Engineer)',
    email: 'elena.tech@helpdeskhub.internal',
    passwordHash: await bcrypt.hash('TechPass123!', salt),
    role: ROLES.TECHNICIAN,
    department: 'Cloud Services',
    skills: ['Cloud & DevOps Platforms']
  });

  const employeeUser1 = await User.create({
    name: 'David Vance (Finance Analyst)',
    email: 'employee@helpdeskhub.internal',
    passwordHash: await bcrypt.hash('EmployeePass123!', salt),
    role: ROLES.EMPLOYEE,
    department: 'Corporate Finance'
  });

  const employeeUser2 = await User.create({
    name: 'Maya Lin (HR Specialist)',
    email: 'maya.hr@helpdeskhub.internal',
    passwordHash: await bcrypt.hash('EmployeePass123!', salt),
    role: ROLES.EMPLOYEE,
    department: 'People Operations'
  });

  // 5. Seed Initial Tickets
  console.log('Generating seed incident tickets across 9-state FSM...');
  const currentYear = new Date().getFullYear();

  // Ticket 1: Critical Network Outage (In Progress)
  const dead1 = await calculateTicketDeadlines(TICKET_PRIORITY.CRITICAL);
  const ticket1 = await Ticket.create({
    ticketNumber: `HD-${currentYear}-0001`,
    title: 'Floor 4 Core Switch Packet Loss',
    description: 'Finance department experiencing 45% packet loss on VLAN 20.',
    category: categories[1]._id,
    subcategory: 'Switch Outage',
    priority: TICKET_PRIORITY.CRITICAL,
    status: TICKET_STATUS.IN_PROGRESS,
    requesterId: employeeUser1._id,
    assignedTechnicianId: techUser1._id,
    slaPolicyId: slaPolicyMap[TICKET_PRIORITY.CRITICAL],
    firstResponseDeadline: dead1.firstResponseDeadline,
    resolutionDeadline: dead1.resolutionDeadline,
    firstResponseAt: new Date()
  });

  // Ticket 2: New Unassigned Ticket (Triage Queue)
  const dead2 = await calculateTicketDeadlines(TICKET_PRIORITY.MEDIUM);
  const ticket2 = await Ticket.create({
    ticketNumber: `HD-${currentYear}-0002`,
    title: 'Secondary 4K Monitor Setup Request',
    description: 'Requester received Dell UltraSharp monitor; requires USB-C display link adapter.',
    category: categories[0]._id,
    subcategory: 'Docking Station',
    priority: TICKET_PRIORITY.MEDIUM,
    status: TICKET_STATUS.NEW,
    requesterId: employeeUser2._id,
    slaPolicyId: slaPolicyMap[TICKET_PRIORITY.MEDIUM],
    firstResponseDeadline: dead2.firstResponseDeadline,
    resolutionDeadline: dead2.resolutionDeadline
  });

  // Ticket 3: Paused Pending User Ticket
  const dead3 = await calculateTicketDeadlines(TICKET_PRIORITY.HIGH);
  const ticket3 = await Ticket.create({
    ticketNumber: `HD-${currentYear}-0003`,
    title: 'VPN Error 800 Authentication Failure',
    description: 'Remote employee unable to connect to internal staging gateway.',
    category: categories[1]._id,
    subcategory: 'VPN Gateway',
    priority: TICKET_PRIORITY.HIGH,
    status: TICKET_STATUS.PENDING_USER,
    requesterId: employeeUser1._id,
    assignedTechnicianId: techUser1._id,
    slaPolicyId: slaPolicyMap[TICKET_PRIORITY.HIGH],
    firstResponseDeadline: dead3.firstResponseDeadline,
    resolutionDeadline: dead3.resolutionDeadline,
    firstResponseAt: new Date(),
    isSlaPaused: true,
    lastPausedAt: new Date()
  });

  // Ticket 4: Resolved Incident
  const dead4 = await calculateTicketDeadlines(TICKET_PRIORITY.LOW);
  const ticket4 = await Ticket.create({
    ticketNumber: `HD-${currentYear}-0004`,
    title: 'License Renewal: Microsoft Visio Pro',
    description: 'Department license key expired during architectural review.',
    category: categories[3]._id,
    subcategory: 'License Key Request',
    priority: TICKET_PRIORITY.LOW,
    status: TICKET_STATUS.RESOLVED,
    requesterId: employeeUser2._id,
    assignedTechnicianId: techUser2._id,
    slaPolicyId: slaPolicyMap[TICKET_PRIORITY.LOW],
    firstResponseDeadline: dead4.firstResponseDeadline,
    resolutionDeadline: dead4.resolutionDeadline,
    firstResponseAt: new Date(Date.now() - 3600000),
    resolvedAt: new Date(),
    resolutionSummary: 'Assigned available enterprise license key from pooled inventory.'
  });

  // 6. Seed Public & Confidential Internal Comments
  console.log('Seeding public discussion and confidential internal notes...');
  await Comment.create([
    {
      ticketId: ticket1._id,
      authorId: employeeUser1._id,
      content: 'Multiple analysts cannot access ERP database.',
      isInternal: false
    },
    {
      ticketId: ticket1._id,
      authorId: techUser1._id,
      content: 'CONFIDENTIAL: Traced issue to corrupted SFP+ module on Cisco Catalyst switch port 12. Replacing hardware now.',
      isInternal: true
    },
    {
      ticketId: ticket3._id,
      authorId: techUser1._id,
      content: 'Please upload your %temp%\\vpn_client.log dump so we can inspect handshake packets.',
      isInternal: false
    }
  ]);

  // 7. Seed Counter for HD-YYYY-XXXX
  await Counter.create({
    _id: `ticketSeq_${currentYear}`,
    currentSeq: 4
  });

  console.log('=====================================================');
  console.log('  HELPDESK HUB DATABASE SEED COMPLETE (ENTERPRISE)');
  console.log('=====================================================');
  console.log('  Administrator Account:');
  console.log('    Email:    admin@helpdeskhub.internal');
  console.log('    Password: AdminPass123!');
  console.log('  Technician Account:');
  console.log('    Email:    tech@helpdeskhub.internal');
  console.log('    Password: TechPass123!');
  console.log('  Employee Account:');
  console.log('    Email:    employee@helpdeskhub.internal');
  console.log('    Password: EmployeePass123!');
  console.log('=====================================================');

  await disconnectDB();
}

// Allow direct CLI execution: node src/utils/seed.js
if (process.argv[1]?.includes('seed.js')) {
  seedDatabase().catch((err) => {
    console.error('Database seeding failed:', err);
    process.exit(1);
  });
}
