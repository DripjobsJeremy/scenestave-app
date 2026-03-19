/**
 * dataInitializer.js
 * Seeds sample data into localStorage for testing/demo purposes.
 * Call initializeSampleData() for first-run seeding (skips if data exists).
 * Call forceResetDemoData() to always restore all demo data.
 */

// ─── Demo Data Definitions ────────────────────────────────────────────────────

const DEMO_DONOR_LEVELS = [
  { id: 'level_1', name: 'Friend',      minAmount: 0,    maxAmount: 99,   color: '#93c5fd', benefits: ['Newsletter'] },
  { id: 'level_2', name: 'Supporter',   minAmount: 100,  maxAmount: 499,  color: '#60a5fa', benefits: ['Newsletter', 'Season Program Credit'] },
  { id: 'level_3', name: 'Patron',      minAmount: 500,  maxAmount: 999,  color: '#3b82f6', benefits: ['Newsletter', 'Program Credit', 'VIP Reception Invite'] },
  { id: 'level_4', name: 'Benefactor',  minAmount: 1000, maxAmount: 4999, color: '#2563eb', benefits: ['All Patron benefits', 'Reserved Seating'] },
  { id: 'level_5', name: 'Angel',       minAmount: 5000, maxAmount: null, color: '#1e40af', benefits: ['All Benefactor benefits', 'Backstage Tour', 'Producer Credit'] }
];

const DEMO_CAMPAIGNS = [
  { id: 'camp_1', name: 'Annual Fund 2026',        status: 'active',    goal: 50000, raised: 18450, startDate: '2026-01-01', endDate: '2026-12-31' },
  { id: 'camp_2', name: 'New Theatre Seats',        status: 'active',    goal: 25000, raised: 9800,  startDate: '2025-09-01', endDate: '2026-06-30' },
  { id: 'camp_3', name: 'Youth Education Program',  status: 'active',    goal: 15000, raised: 6750,  startDate: '2026-01-15', endDate: '2026-08-31' },
  { id: 'camp_4', name: 'Tootsie Production Fund',  status: 'active',    goal: 12000, raised: 4200,  startDate: '2026-02-01', endDate: '2026-05-31' }
];

const DEMO_CONTACTS = [
  {
    id: 'contact_1',
    firstName: 'Margaret', lastName: 'Henderson',
    email: 'margaret.henderson@email.com', phone: '555-0101',
    address: { street: '412 Maple Drive', city: 'Riverside', state: 'CA', zip: '92501' },
    groups: ['Donor', 'Board'], tags: ['Donor', 'Board Member', 'Major Donor'],
    isDonor: true,
    donorProfile: {
      donorLevelId: 'level_5',
      lifetimeTotal: 8500,
      firstDonationDate: '2022-03-15',
      lastDonationDate: '2026-01-20',
      totalDonations: 4,
      acknowledgedCount: 4
    },
    createdAt: '2022-03-15T00:00:00.000Z', updatedAt: '2026-01-20T00:00:00.000Z'
  },
  {
    id: 'contact_2',
    firstName: 'Robert', lastName: 'Chen',
    email: 'robert.chen@email.com', phone: '555-0102',
    address: { street: '88 Willow Lane', city: 'Riverside', state: 'CA', zip: '92503' },
    groups: ['Donor'], tags: ['Donor', 'Recurring'],
    isDonor: true,
    donorProfile: {
      donorLevelId: 'level_4',
      lifetimeTotal: 4000,
      firstDonationDate: '2023-05-10',
      lastDonationDate: '2026-02-01',
      totalDonations: 3,
      acknowledgedCount: 3
    },
    createdAt: '2023-05-10T00:00:00.000Z', updatedAt: '2026-02-01T00:00:00.000Z'
  },
  {
    id: 'contact_3',
    firstName: 'Sarah', lastName: 'Williams',
    email: 'sarah.williams@email.com', phone: '555-0103',
    address: { street: '27 Oak Street', city: 'Corona', state: 'CA', zip: '92882' },
    groups: ['Donor', 'Volunteer'], tags: ['Donor', 'Volunteer'],
    isDonor: true,
    donorProfile: {
      donorLevelId: 'level_3',
      lifetimeTotal: 1250,
      firstDonationDate: '2024-02-14',
      lastDonationDate: '2026-01-08',
      totalDonations: 3,
      acknowledgedCount: 3
    },
    createdAt: '2024-02-14T00:00:00.000Z', updatedAt: '2026-01-08T00:00:00.000Z'
  },
  {
    id: 'contact_4',
    firstName: 'James', lastName: 'Thompson',
    email: 'jthompson@email.com', phone: '555-0104',
    address: { street: '1560 Pine Avenue', city: 'Riverside', state: 'CA', zip: '92504' },
    groups: ['Donor'], tags: ['Donor'],
    isDonor: true,
    donorProfile: {
      donorLevelId: 'level_4',
      lifetimeTotal: 2400,
      firstDonationDate: '2023-09-01',
      lastDonationDate: '2025-12-15',
      totalDonations: 3,
      acknowledgedCount: 3
    },
    createdAt: '2023-09-01T00:00:00.000Z', updatedAt: '2025-12-15T00:00:00.000Z'
  },
  {
    id: 'contact_5',
    firstName: 'Emily', lastName: 'Rodriguez',
    email: 'emily.rodriguez@email.com', phone: '555-0105',
    address: { street: '340 Birch Court', city: 'Moreno Valley', state: 'CA', zip: '92553' },
    groups: ['Donor'], tags: ['Donor', 'New Donor'],
    isDonor: true,
    donorProfile: {
      donorLevelId: 'level_2',
      lifetimeTotal: 450,
      firstDonationDate: '2025-10-05',
      lastDonationDate: '2026-02-10',
      totalDonations: 2,
      acknowledgedCount: 2
    },
    createdAt: '2025-10-05T00:00:00.000Z', updatedAt: '2026-02-10T00:00:00.000Z'
  },
  {
    id: 'contact_6',
    firstName: 'Patricia', lastName: 'Nguyen',
    email: 'p.nguyen@email.com', phone: '555-0106',
    address: { street: '715 Elm Boulevard', city: 'Riverside', state: 'CA', zip: '92506' },
    groups: ['Donor', 'Board'], tags: ['Donor', 'Board Member'],
    isDonor: true,
    donorProfile: {
      donorLevelId: 'level_4',
      lifetimeTotal: 3200,
      firstDonationDate: '2022-11-30',
      lastDonationDate: '2026-01-15',
      totalDonations: 4,
      acknowledgedCount: 4
    },
    createdAt: '2022-11-30T00:00:00.000Z', updatedAt: '2026-01-15T00:00:00.000Z'
  },
  {
    id: 'contact_7',
    firstName: 'David', lastName: 'Okafor',
    email: 'd.okafor@email.com', phone: '555-0107',
    address: { street: '203 Cedar Way', city: 'Riverside', state: 'CA', zip: '92507' },
    groups: ['Volunteer'], tags: ['Volunteer'],
    isDonor: false,
    createdAt: '2025-01-10T00:00:00.000Z', updatedAt: '2025-01-10T00:00:00.000Z'
  },
  {
    id: 'contact_8',
    firstName: 'Linda', lastName: 'Foster',
    email: 'linda.foster@email.com', phone: '555-0108',
    address: { street: '89 Sycamore Place', city: 'Corona', state: 'CA', zip: '92879' },
    groups: ['Donor'], tags: ['Donor'],
    isDonor: true,
    donorProfile: {
      donorLevelId: 'level_3',
      lifetimeTotal: 750,
      firstDonationDate: '2025-03-22',
      lastDonationDate: '2025-11-14',
      totalDonations: 2,
      acknowledgedCount: 2
    },
    createdAt: '2025-03-22T00:00:00.000Z', updatedAt: '2025-11-14T00:00:00.000Z'
  }
];

const DEMO_DONATIONS = [
  { id: 'don_1',  contactId: 'contact_1', amount: 5000, date: '2026-01-20', recurringType: 'one-time', campaignId: 'camp_1', campaignName: 'Annual Fund 2026',       paymentMethod: 'Check',       acknowledgmentSent: true,  notes: 'Generous Angel-level gift' },
  { id: 'don_2',  contactId: 'contact_1', amount: 2000, date: '2025-04-10', recurringType: 'one-time', campaignId: 'camp_2', campaignName: 'New Theatre Seats',       paymentMethod: 'Credit Card', acknowledgmentSent: true,  notes: '' },
  { id: 'don_3',  contactId: 'contact_1', amount: 1000, date: '2024-11-05', recurringType: 'one-time', campaignId: 'camp_1', campaignName: 'Annual Fund 2026',       paymentMethod: 'Check',       acknowledgmentSent: true,  notes: '' },
  { id: 'don_4',  contactId: 'contact_1', amount: 500,  date: '2023-06-20', recurringType: 'one-time', campaignId: 'camp_3', campaignName: 'Youth Education Program', paymentMethod: 'Check',       acknowledgmentSent: true,  notes: '' },
  { id: 'don_5',  contactId: 'contact_2', amount: 2000, date: '2026-02-01', recurringType: 'one-time', campaignId: 'camp_4', campaignName: 'Tootsie Production Fund', paymentMethod: 'Credit Card', acknowledgmentSent: true,  notes: 'Named sponsor' },
  { id: 'don_6',  contactId: 'contact_2', amount: 1500, date: '2025-08-15', recurringType: 'one-time', campaignId: 'camp_2', campaignName: 'New Theatre Seats',       paymentMethod: 'Online',      acknowledgmentSent: true,  notes: '' },
  { id: 'don_7',  contactId: 'contact_2', amount: 500,  date: '2024-03-01', recurringType: 'one-time', campaignId: 'camp_1', campaignName: 'Annual Fund 2026',       paymentMethod: 'Credit Card', acknowledgmentSent: true,  notes: '' },
  { id: 'don_8',  contactId: 'contact_3', amount: 500,  date: '2026-01-08', recurringType: 'one-time', campaignId: 'camp_3', campaignName: 'Youth Education Program', paymentMethod: 'Online',      acknowledgmentSent: true,  notes: 'In memory of her father' },
  { id: 'don_9',  contactId: 'contact_3', amount: 500,  date: '2025-06-12', recurringType: 'one-time', campaignId: 'camp_1', campaignName: 'Annual Fund 2026',       paymentMethod: 'Credit Card', acknowledgmentSent: true,  notes: '' },
  { id: 'don_10', contactId: 'contact_3', amount: 250,  date: '2024-12-01', recurringType: 'one-time', campaignId: 'camp_2', campaignName: 'New Theatre Seats',       paymentMethod: 'Cash',        acknowledgmentSent: true,  notes: '' },
  { id: 'don_11', contactId: 'contact_4', amount: 1200, date: '2025-12-15', recurringType: 'one-time', campaignId: 'camp_2', campaignName: 'New Theatre Seats',       paymentMethod: 'Check',       acknowledgmentSent: true,  notes: '' },
  { id: 'don_12', contactId: 'contact_4', amount: 800,  date: '2025-03-10', recurringType: 'one-time', campaignId: 'camp_1', campaignName: 'Annual Fund 2026',       paymentMethod: 'Check',       acknowledgmentSent: true,  notes: '' },
  { id: 'don_13', contactId: 'contact_4', amount: 400,  date: '2024-07-04', recurringType: 'one-time', campaignId: 'camp_3', campaignName: 'Youth Education Program', paymentMethod: 'Online',      acknowledgmentSent: true,  notes: '' },
  { id: 'don_14', contactId: 'contact_5', amount: 300,  date: '2026-02-10', recurringType: 'one-time', campaignId: 'camp_4', campaignName: 'Tootsie Production Fund', paymentMethod: 'Online',      acknowledgmentSent: false, notes: '' },
  { id: 'don_15', contactId: 'contact_5', amount: 150,  date: '2025-10-05', recurringType: 'one-time', campaignId: 'camp_1', campaignName: 'Annual Fund 2026',       paymentMethod: 'Credit Card', acknowledgmentSent: true,  notes: '' },
  { id: 'don_16', contactId: 'contact_6', amount: 1500, date: '2026-01-15', recurringType: 'one-time', campaignId: 'camp_4', campaignName: 'Tootsie Production Fund', paymentMethod: 'Check',       acknowledgmentSent: true,  notes: 'Corporate match' },
  { id: 'don_17', contactId: 'contact_6', amount: 1000, date: '2025-05-20', recurringType: 'one-time', campaignId: 'camp_2', campaignName: 'New Theatre Seats',       paymentMethod: 'Check',       acknowledgmentSent: true,  notes: '' },
  { id: 'don_18', contactId: 'contact_6', amount: 500,  date: '2024-01-08', recurringType: 'one-time', campaignId: 'camp_1', campaignName: 'Annual Fund 2026',       paymentMethod: 'Online',      acknowledgmentSent: true,  notes: '' },
  { id: 'don_19', contactId: 'contact_6', amount: 200,  date: '2023-07-15', recurringType: 'one-time', campaignId: 'camp_3', campaignName: 'Youth Education Program', paymentMethod: 'Cash',        acknowledgmentSent: true,  notes: '' },
  { id: 'don_20', contactId: 'contact_8', amount: 500,  date: '2025-11-14', recurringType: 'one-time', campaignId: 'camp_1', campaignName: 'Annual Fund 2026',       paymentMethod: 'Credit Card', acknowledgmentSent: true,  notes: '' },
  { id: 'don_21', contactId: 'contact_8', amount: 250,  date: '2025-03-22', recurringType: 'one-time', campaignId: 'camp_3', campaignName: 'Youth Education Program', paymentMethod: 'Online',      acknowledgmentSent: true,  notes: '' }
];

const DEMO_ACTORS = [
  {
    id: 'actor_demo_1',
    firstName: 'Jessica', lastName: 'Martinez',
    email: 'jessica.martinez@actors.com', phone: '555-0201',
    groups: ['Actor'], isDonor: false,
    actorProfile: {
      resume: null, headshots: [], auditionVideos: [],
      vocalRange: 'Soprano',
      specialSkills: ['Tap Dance', 'Jazz', 'Ballet', 'Stage Combat'],
      experienceLevel: 'Professional',
      unionAffiliation: ['AEA'],
      sizeCard: { height: "5'6\"", weight: '125 lbs', shirtSize: 'S', pantsSize: '4', shoeSize: '7', dressSize: '4', chest: '34', waist: '26', inseam: '30', updatedAt: '2026-01-01T00:00:00.000Z' },
      conflicts: [],
      joinedDate: '2023-09-01T00:00:00.000Z',
      totalProductions: 4,
      credentials: { hashedPassword: null, passwordResetToken: null, emailVerified: false }
    },
    createdAt: '2023-09-01T00:00:00.000Z', updatedAt: '2026-01-15T00:00:00.000Z'
  },
  {
    id: 'actor_demo_2',
    firstName: 'Michael', lastName: 'Brooks',
    email: 'michael.brooks@actors.com', phone: '555-0202',
    groups: ['Actor'], isDonor: false,
    actorProfile: {
      resume: null, headshots: [], auditionVideos: [],
      vocalRange: 'Baritone',
      specialSkills: ['Stage Combat', 'Dialects', 'Improv', 'Juggling'],
      experienceLevel: 'Professional',
      unionAffiliation: ['AEA', 'SAG-AFTRA'],
      sizeCard: { height: "5'11\"", weight: '175 lbs', shirtSize: 'M', pantsSize: '32x32', shoeSize: '10.5', dressSize: '', chest: '40', waist: '33', inseam: '32', updatedAt: '2026-01-01T00:00:00.000Z' },
      conflicts: [{ date: '2026-04-10', reason: 'Film shoot' }],
      joinedDate: '2022-06-15T00:00:00.000Z',
      totalProductions: 7,
      credentials: { hashedPassword: null, passwordResetToken: null, emailVerified: false }
    },
    createdAt: '2022-06-15T00:00:00.000Z', updatedAt: '2026-02-01T00:00:00.000Z'
  },
  {
    id: 'actor_demo_3',
    firstName: 'Amanda', lastName: 'Chen',
    email: 'amanda.chen@actors.com', phone: '555-0203',
    groups: ['Actor'], isDonor: false,
    actorProfile: {
      resume: null, headshots: [], auditionVideos: [],
      vocalRange: 'Mezzo-Soprano',
      specialSkills: ['Violin', 'Tap Dance', 'Aerial Silk', 'Dialects'],
      experienceLevel: 'Semi-Professional',
      unionAffiliation: [],
      sizeCard: { height: "5'4\"", weight: '118 lbs', shirtSize: 'XS', pantsSize: '2', shoeSize: '6.5', dressSize: '2', chest: '33', waist: '25', inseam: '29', updatedAt: '2026-01-01T00:00:00.000Z' },
      conflicts: [],
      joinedDate: '2024-01-10T00:00:00.000Z',
      totalProductions: 2,
      credentials: { hashedPassword: null, passwordResetToken: null, emailVerified: false }
    },
    createdAt: '2024-01-10T00:00:00.000Z', updatedAt: '2026-01-10T00:00:00.000Z'
  },
  {
    id: 'actor_demo_4',
    firstName: 'David', lastName: 'Park',
    email: 'david.park@actors.com', phone: '555-0204',
    groups: ['Actor'], isDonor: false,
    actorProfile: {
      resume: null, headshots: [], auditionVideos: [],
      vocalRange: 'Tenor',
      specialSkills: ['Physical Comedy', 'Improv', 'Guitar', 'Tap Dance'],
      experienceLevel: 'Professional',
      unionAffiliation: ['AEA'],
      sizeCard: { height: "5'9\"", weight: '160 lbs', shirtSize: 'M', pantsSize: '31x30', shoeSize: '9', dressSize: '', chest: '38', waist: '31', inseam: '30', updatedAt: '2026-01-01T00:00:00.000Z' },
      conflicts: [],
      joinedDate: '2023-03-20T00:00:00.000Z',
      totalProductions: 5,
      credentials: { hashedPassword: null, passwordResetToken: null, emailVerified: false }
    },
    createdAt: '2023-03-20T00:00:00.000Z', updatedAt: '2026-01-20T00:00:00.000Z'
  },
  {
    id: 'actor_demo_5',
    firstName: 'Rachel', lastName: 'Foster',
    email: 'rachel.foster@actors.com', phone: '555-0205',
    groups: ['Actor'], isDonor: false,
    actorProfile: {
      resume: null, headshots: [], auditionVideos: [],
      vocalRange: 'Soprano',
      specialSkills: ['Ballet', 'Contemporary Dance', 'Piano', 'Stage Combat'],
      experienceLevel: 'Semi-Professional',
      unionAffiliation: [],
      sizeCard: { height: "5'5\"", weight: '120 lbs', shirtSize: 'S', pantsSize: '4', shoeSize: '7.5', dressSize: '4', chest: '34', waist: '26', inseam: '30', updatedAt: '2026-01-01T00:00:00.000Z' },
      conflicts: [],
      joinedDate: '2024-08-01T00:00:00.000Z',
      totalProductions: 2,
      credentials: { hashedPassword: null, passwordResetToken: null, emailVerified: false }
    },
    createdAt: '2024-08-01T00:00:00.000Z', updatedAt: '2026-01-05T00:00:00.000Z'
  },
  {
    id: 'actor_demo_6',
    firstName: 'Thomas', lastName: 'Wright',
    email: 'thomas.wright@actors.com', phone: '555-0206',
    groups: ['Actor'], isDonor: false,
    actorProfile: {
      resume: null, headshots: [], auditionVideos: [],
      vocalRange: 'Bass-Baritone',
      specialSkills: ['Dialects', 'Stage Combat', 'Mime', 'Horseback Riding'],
      experienceLevel: 'Professional',
      unionAffiliation: ['AEA'],
      sizeCard: { height: "6'1\"", weight: '195 lbs', shirtSize: 'L', pantsSize: '34x32', shoeSize: '11', dressSize: '', chest: '44', waist: '36', inseam: '32', updatedAt: '2026-01-01T00:00:00.000Z' },
      conflicts: [],
      joinedDate: '2021-04-12T00:00:00.000Z',
      totalProductions: 9,
      credentials: { hashedPassword: null, passwordResetToken: null, emailVerified: false }
    },
    createdAt: '2021-04-12T00:00:00.000Z', updatedAt: '2026-01-25T00:00:00.000Z'
  },
  {
    id: 'actor_demo_7',
    firstName: 'Olivia', lastName: 'Santos',
    email: 'olivia.santos@actors.com', phone: '555-0207',
    groups: ['Actor'], isDonor: false,
    actorProfile: {
      resume: null, headshots: [], auditionVideos: [],
      vocalRange: 'Alto',
      specialSkills: ['Flamenco', 'Jazz', 'Acrobatics', 'Puppetry'],
      experienceLevel: 'Semi-Professional',
      unionAffiliation: [],
      sizeCard: { height: "5'3\"", weight: '115 lbs', shirtSize: 'XS', pantsSize: '2', shoeSize: '6', dressSize: '2', chest: '32', waist: '24', inseam: '28', updatedAt: '2026-01-01T00:00:00.000Z' },
      conflicts: [],
      joinedDate: '2025-01-05T00:00:00.000Z',
      totalProductions: 1,
      credentials: { hashedPassword: null, passwordResetToken: null, emailVerified: false }
    },
    createdAt: '2025-01-05T00:00:00.000Z', updatedAt: '2026-01-05T00:00:00.000Z'
  },
  {
    id: 'actor_demo_8',
    firstName: 'Christopher', lastName: 'Lee',
    email: 'chris.lee@actors.com', phone: '555-0208',
    groups: ['Actor'], isDonor: false,
    actorProfile: {
      resume: null, headshots: [], auditionVideos: [],
      vocalRange: 'Tenor',
      specialSkills: ['Tap Dance', 'Breakdance', 'Tumbling', 'Beatbox'],
      experienceLevel: 'Semi-Professional',
      unionAffiliation: [],
      sizeCard: { height: "5'10\"", weight: '158 lbs', shirtSize: 'M', pantsSize: '30x30', shoeSize: '9.5', dressSize: '', chest: '38', waist: '30', inseam: '30', updatedAt: '2026-01-01T00:00:00.000Z' },
      conflicts: [],
      joinedDate: '2025-02-01T00:00:00.000Z',
      totalProductions: 1,
      credentials: { hashedPassword: null, passwordResetToken: null, emailVerified: false }
    },
    createdAt: '2025-02-01T00:00:00.000Z', updatedAt: '2026-01-05T00:00:00.000Z'
  }
];

const DEMO_PRODUCTIONS = [
  {
    id: 'prod_demo_1',
    title: 'Tootsie',
    director: 'Rebecca Hartley',
    startDate: '2026-04-10',
    endDate: '2026-05-02',
    status: 'In Rehearsal',
    description: 'Based on the beloved 1982 film. A struggling actor disguises himself as a woman to land a role in a soap opera, finding unexpected success—and complications.',
    venue: 'Riverside Community Theatre – Main Stage',
    characters: [
      { id: 'char_demo_1', name: 'Michael Dorsey / Dorothy Michaels', actorId: 'actor_demo_2', notes: 'Lead – requires quick costume changes' },
      { id: 'char_demo_2', name: 'Julie Nichols',                     actorId: 'actor_demo_1', notes: 'Lead ingénue' },
      { id: 'char_demo_3', name: 'Sandy Lester',                      actorId: 'actor_demo_5', notes: 'Comic relief, tap number in Act 2' },
      { id: 'char_demo_4', name: 'Jeff Slater',                       actorId: 'actor_demo_4', notes: 'Michael\'s roommate / comic foil' },
      { id: 'char_demo_5', name: 'Ron Carlisle',                      actorId: 'actor_demo_6', notes: 'TV director, antagonist' },
      { id: 'char_demo_6', name: 'Les Nichols',                       actorId: 'actor_demo_3', notes: 'Julie\'s father, love interest of Dorothy' },
      { id: 'char_demo_7', name: 'Ensemble / Swing',                  actorId: 'actor_demo_7', notes: '' },
      { id: 'char_demo_8', name: 'Ensemble / Swing',                  actorId: 'actor_demo_8', notes: '' }
    ],
    acts: [
      {
        name: 'Act One',
        scenes: [
          {
            name: 'Scene 1 – The Unemployment Office',
            location: 'New York City Unemployment Office',
            time: 'Daytime, 1981',
            description: 'Michael Dorsey, a notoriously difficult actor, is denied unemployment and learns he is effectively blacklisted from NYC theatre.',
            lighting: {
              fixtures: [
                { type: 'Fresnel', quantity: 4, color: 'Cool White', cost: 120 },
                { type: 'LED Par', quantity: 8, color: 'Fluorescent Green', cost: 240 }
              ],
              gels: [
                { color: 'Lee 201 – Full CT Blue', cost: 18 },
                { color: 'Lee 101 – Yellow', cost: 18 }
              ],
              cues: []
            },
            sound: {
              cues: [
                { name: 'Office Ambience', description: 'Background office noise', cost: 0 },
                { name: 'NYC Street FX', description: 'Taxi horns, crowd noise', cost: 0 }
              ],
              music: [],
              equipment: []
            },
            wardrobe: {
              costumes: [
                { character: 'Michael Dorsey', description: 'Worn blazer, jeans, scuffed shoes', cost: 95 },
                { character: 'Ensemble', description: 'Period-appropriate office wear (x6)', cost: 420 }
              ],
              items: []
            },
            props: {
              items: [
                { name: 'Unemployment Forms', quantity: 20, cost: 5 },
                { name: 'Filing Cabinets (set dressing)', quantity: 2, cost: 0 },
                { name: 'Vintage Telephone', quantity: 1, cost: 35 }
              ]
            },
            set: {
              pieces: [
                { name: 'Government Counter Unit', description: 'Freestanding counter with window grate', cost: 450 },
                { name: 'Waiting Room Chairs', description: 'Set of 6 plastic chairs', cost: 120 }
              ],
              elements: []
            }
          },
          {
            name: 'Scene 2 – Michael\'s Apartment',
            location: 'Michael and Jeff\'s apartment, Lower East Side',
            time: 'That evening',
            description: 'Michael hatches his plan to audition as a woman after seeing a casting notice for a soap opera. Jeff tries to talk him out of it.',
            lighting: {
              fixtures: [
                { type: 'LED Par', quantity: 6, color: 'Warm Amber', cost: 180 },
                { type: 'Practical Lamp', quantity: 2, color: 'Incandescent', cost: 60 }
              ],
              gels: [
                { color: 'Lee 205 – Half CT Orange', cost: 12 }
              ],
              cues: []
            },
            sound: {
              cues: [
                { name: 'TV Background', description: 'Period TV show audio', cost: 50 }
              ],
              music: [
                { title: 'Opening Number: "What\'s a Guy Gotta Do?"', composer: 'David Yazbek', cost: 0 }
              ],
              equipment: [
                { name: 'Practical TV Set (prop speaker)', quantity: 1, cost: 85 }
              ]
            },
            wardrobe: {
              costumes: [
                { character: 'Michael Dorsey', description: 'Casual home wear', cost: 45 },
                { character: 'Jeff Slater', description: 'Lounge wear, vintage t-shirt', cost: 55 }
              ],
              items: [
                { name: 'Dorothy Wig – First fitting', description: 'Brunette wig, styled', cost: 185 }
              ]
            },
            props: {
              items: [
                { name: 'Backstage! magazine (casting notice)', quantity: 1, cost: 8 },
                { name: 'Takeout containers', quantity: 4, cost: 12 },
                { name: 'Makeup kit (Michael\'s)', quantity: 1, cost: 65 }
              ]
            },
            set: {
              pieces: [
                { name: 'Apartment Sofa', description: 'Worn 1980s-style sofa', cost: 0 },
                { name: 'Kitchenette Unit', description: 'Practical sink and counter', cost: 280 }
              ],
              elements: [
                { name: 'Framed headshots on wall', cost: 30 }
              ]
            }
          },
          {
            name: 'Scene 3 – The Soap Opera Audition',
            location: 'Manhattan Transfer TV Studios',
            time: 'Next morning',
            description: 'Michael, as Dorothy Michaels, auditions for the role of Emily Kimberly and lands the part, stunning everyone—including himself.',
            lighting: {
              fixtures: [
                { type: 'Studio Fresnel', quantity: 6, color: 'TV White', cost: 360 },
                { type: 'Cyc Light', quantity: 4, color: 'Blue Sky', cost: 200 }
              ],
              gels: [
                { color: 'Lee 216 – White Diffusion', cost: 22 },
                { color: 'Lee 079 – Just Blue', cost: 22 }
              ],
              cues: []
            },
            sound: {
              cues: [
                { name: 'Studio Slate / Clapper', description: 'Scene slate sound effect', cost: 0 }
              ],
              music: [
                { title: '"The Tv That Broke My Heart"', composer: 'David Yazbek', cost: 0 }
              ],
              equipment: []
            },
            wardrobe: {
              costumes: [
                { character: 'Dorothy Michaels (Michael)', description: 'Conservative blouse, skirt, sensible heels, wig', cost: 385 },
                { character: 'Ron Carlisle', description: 'Director\'s blazer and turtleneck', cost: 110 }
              ],
              items: [
                { name: 'Dorothy Purse', description: 'Vintage handbag', cost: 45 },
                { name: 'Character Glasses (Dorothy)', description: 'Oversized frames', cost: 28 }
              ]
            },
            props: {
              items: [
                { name: 'TV Camera (set dressing)', quantity: 1, cost: 0 },
                { name: 'Script sides', quantity: 10, cost: 3 },
                { name: 'Director\'s clipboard', quantity: 1, cost: 15 }
              ]
            },
            set: {
              pieces: [
                { name: 'TV Studio Set Flat', description: 'Painted flat representing hospital set', cost: 380 },
                { name: 'Camera Dolly (prop)', description: 'Practical rolling camera stand', cost: 0 }
              ],
              elements: []
            }
          },
          {
            name: 'Scene 4 – "Juliet of the Spirits" – TV Taping',
            location: 'Manhattan Transfer Studios – On Set',
            time: 'Weeks later',
            description: 'Dorothy becomes a fan favorite on the soap opera. Julie and Dorothy begin to grow close.',
            lighting: {
              fixtures: [
                { type: 'LED Par', quantity: 10, color: 'Warm White', cost: 300 },
                { type: 'Follow Spot', quantity: 1, color: 'Neutral', cost: 250 }
              ],
              gels: [],
              cues: []
            },
            sound: {
              cues: [],
              music: [
                { title: '"Soap Opera Theme (In-Show)"', composer: 'David Yazbek', cost: 0 },
                { title: '"Seeing Through Dorothy\'s Eyes"', composer: 'David Yazbek', cost: 0 }
              ],
              equipment: []
            },
            wardrobe: {
              costumes: [
                { character: 'Dorothy Michaels (Michael)', description: 'Hospital administrator costume (TV wardrobe)', cost: 265 },
                { character: 'Julie Nichols', description: 'Casual professional attire', cost: 155 }
              ],
              items: []
            },
            props: {
              items: [
                { name: 'Medical Chart (prop)', quantity: 2, cost: 10 },
                { name: 'Bouquet of Flowers', quantity: 1, cost: 22 }
              ]
            },
            set: {
              pieces: [
                { name: 'Hospital Room Flat', description: 'Soap-opera-style painted flat', cost: 290 }
              ],
              elements: [
                { name: 'Studio Monitor (set dressing)', cost: 0 }
              ]
            }
          }
        ]
      },
      {
        name: 'Act Two',
        scenes: [
          {
            name: 'Scene 5 – Julie\'s Farm',
            location: 'Julie\'s family farm, upstate New York',
            time: 'A weekend',
            description: 'Dorothy visits Julie\'s father Les at the farm. Les falls for Dorothy, complicating everything. Michael realizes he has genuine feelings for Julie.',
            lighting: {
              fixtures: [
                { type: 'LED Par', quantity: 8, color: 'Golden Hour', cost: 240 },
                { type: 'Striplights', quantity: 4, color: 'Warm Amber', cost: 180 }
              ],
              gels: [
                { color: 'Lee 010 – Medium Yellow', cost: 15 },
                { color: 'Lee 304 – Pale Apricot', cost: 15 }
              ],
              cues: []
            },
            sound: {
              cues: [
                { name: 'Bird Song / Country Ambience', description: 'Outdoor rural soundscape', cost: 0 },
                { name: 'Wind Through Trees', description: 'Gentle wind FX', cost: 0 }
              ],
              music: [
                { title: '"Who Are You Now?"', composer: 'David Yazbek', cost: 0 }
              ],
              equipment: []
            },
            wardrobe: {
              costumes: [
                { character: 'Dorothy Michaels (Michael)', description: 'Country-weekend dress and cardigan', cost: 195 },
                { character: 'Julie Nichols', description: 'Casual jeans and flannel', cost: 75 },
                { character: 'Les Nichols', description: 'Farmer\'s casual – overalls and plaid', cost: 110 }
              ],
              items: []
            },
            props: {
              items: [
                { name: 'Picnic Basket', quantity: 1, cost: 28 },
                { name: 'Mason jars (set dressing)', quantity: 6, cost: 18 },
                { name: 'Fresh Flowers (bouquet)', quantity: 2, cost: 30 }
              ]
            },
            set: {
              pieces: [
                { name: 'Farmhouse Porch Unit', description: 'Practical steps and rail', cost: 520 },
                { name: 'Garden Bench', description: 'Painted wood bench', cost: 85 }
              ],
              elements: [
                { name: 'Hay bales (set dressing)', cost: 45 }
              ]
            }
          },
          {
            name: 'Scene 6 – The Confrontation',
            location: 'Manhattan Transfer Studios – Dressing Room',
            time: 'Morning of the live broadcast',
            description: 'Ron discovers Dorothy\'s secret. Jeff urges Michael to come clean before the live taping.',
            lighting: {
              fixtures: [
                { type: 'LED Par', quantity: 4, color: 'Harsh White', cost: 120 },
                { type: 'Practical Vanity Lights', quantity: 1, color: 'Warm', cost: 75 }
              ],
              gels: [],
              cues: []
            },
            sound: {
              cues: [
                { name: 'Intercom Announcement', description: 'Studio PA system', cost: 0 },
                { name: 'Dramatic Sting', description: 'Orchestral accent', cost: 0 }
              ],
              music: [],
              equipment: []
            },
            wardrobe: {
              costumes: [
                { character: 'Dorothy Michaels (Michael)', description: 'Dorothy\'s signature on-air blouse + wig', cost: 0 },
                { character: 'Ron Carlisle', description: 'Power suit', cost: 145 }
              ],
              items: [
                { name: 'Makeup Mirror (dressing room)', description: 'Vanity mirror with bulbs', cost: 110 }
              ]
            },
            props: {
              items: [
                { name: 'Hairbrush / Compact', quantity: 2, cost: 20 },
                { name: 'Talent Contract (prop)', quantity: 1, cost: 5 }
              ]
            },
            set: {
              pieces: [
                { name: 'Dressing Room Vanity Unit', description: 'Mirror with surround lights', cost: 340 }
              ],
              elements: []
            }
          },
          {
            name: 'Scene 7 – The Live Broadcast',
            location: 'Manhattan Transfer Studios – Live Stage',
            time: 'That afternoon – LIVE on air',
            description: 'During the live broadcast, Michael reveals himself as Dorothy, confessing everything to Julie on camera in front of millions of viewers.',
            lighting: {
              fixtures: [
                { type: 'LED Par', quantity: 12, color: 'Bright TV White', cost: 360 },
                { type: 'Follow Spot', quantity: 2, color: 'Neutral', cost: 500 },
                { type: 'Audience Blinder', quantity: 4, color: 'White', cost: 200 }
              ],
              gels: [
                { color: 'Lee 216 – White Diffusion', cost: 30 }
              ],
              cues: []
            },
            sound: {
              cues: [
                { name: 'Live Studio Audience Track', description: 'Crowd reactions – gasps, laughter', cost: 0 },
                { name: '"On Air" theme sting', description: 'Show opening fanfare', cost: 0 }
              ],
              music: [
                { title: '"What\'s a Guy Gotta Do? (Reprise)"', composer: 'David Yazbek', cost: 0 }
              ],
              equipment: [
                { name: 'Broadcast Monitor (set dressing)', quantity: 2, cost: 0 }
              ]
            },
            wardrobe: {
              costumes: [
                { character: 'Dorothy → Michael reveal', description: 'Dorothy outfit torn away to reveal Michael\'s clothes underneath – quick-change rigging required', cost: 450 },
                { character: 'Julie Nichols', description: 'On-air soap costume', cost: 185 },
                { character: 'Ron Carlisle', description: 'Formal director on-air suit', cost: 0 }
              ],
              items: [
                { name: 'Dorothy Wig (final reveal)', description: 'Hero wig with release mechanism', cost: 250 }
              ]
            },
            props: {
              items: [
                { name: '"On Air" sign (practical light-up)', quantity: 1, cost: 95 },
                { name: 'Cue cards', quantity: 15, cost: 8 }
              ]
            },
            set: {
              pieces: [
                { name: 'Broadcast Stage Set', description: 'Full soap opera set facade', cost: 680 },
                { name: 'Camera Dollies x2 (props)', description: 'Practical rolling cameras', cost: 0 }
              ],
              elements: [
                { name: 'Teleprompter (set dressing)', cost: 0 }
              ]
            }
          },
          {
            name: 'Scene 8 – Finale',
            location: 'Outside the TV studios / Street',
            time: 'Immediately after',
            description: 'Michael chases Julie through the city and they reconcile in the closing number. Bows.',
            lighting: {
              fixtures: [
                { type: 'LED Par', quantity: 16, color: 'Full Color Wash', cost: 480 },
                { type: 'Follow Spot', quantity: 2, color: 'Warm White', cost: 500 },
                { type: 'Gobo Projector', quantity: 4, color: 'City Street Pattern', cost: 320 }
              ],
              gels: [
                { color: 'Lee 019 – Fire', cost: 18 },
                { color: 'Lee 036 – Medium Pink', cost: 18 }
              ],
              cues: []
            },
            sound: {
              cues: [
                { name: 'City Soundscape', description: 'New York street ambience, taxis', cost: 0 }
              ],
              music: [
                { title: '"Finale: Could\'ve Been a Contender"', composer: 'David Yazbek', cost: 0 },
                { title: 'Curtain Call Music', composer: 'David Yazbek', cost: 0 }
              ],
              equipment: []
            },
            wardrobe: {
              costumes: [
                { character: 'Michael Dorsey', description: 'Final scene – jeans, jacket, himself at last', cost: 85 },
                { character: 'Full Ensemble', description: 'Company bows costumes – polished versions of show looks', cost: 320 }
              ],
              items: []
            },
            props: {
              items: [
                { name: 'Confetti cannon', quantity: 2, cost: 75 },
                { name: 'Bouquet for curtain call', quantity: 3, cost: 45 }
              ]
            },
            set: {
              pieces: [
                { name: 'Street Lamp Posts x3', description: 'Practical streetlights', cost: 390 }
              ],
              elements: [
                { name: 'Newspaper boxes (set dressing)', cost: 60 },
                { name: 'Fire hydrant (set dressing)', cost: 40 }
              ]
            }
          }
        ]
      }
    ],
    createdAt: '2026-01-15T00:00:00.000Z',
    updatedAt: '2026-02-20T00:00:00.000Z'
  },
  {
    id: 'prod_demo_2',
    title: 'Into the Woods',
    director: 'Marcus DeVito',
    startDate: '2026-09-18',
    endDate: '2026-10-11',
    status: 'Planning',
    description: 'Sondheim\'s Tony Award-winning musical weaves together classic fairy tales to explore the consequences of pursuing one\'s wishes.',
    venue: 'Riverside Community Theatre – Main Stage',
    characters: [
      { id: 'char_itw_1', name: 'The Baker',            actorId: 'actor_demo_2', notes: 'Lead baritone' },
      { id: 'char_itw_2', name: 'The Baker\'s Wife',    actorId: 'actor_demo_1', notes: 'Lead soprano' },
      { id: 'char_itw_3', name: 'Cinderella',           actorId: 'actor_demo_5', notes: 'Lyric soprano' },
      { id: 'char_itw_4', name: 'Little Red Ridinghood',actorId: 'actor_demo_3', notes: 'Mezzo, comic physicality' },
      { id: 'char_itw_5', name: 'The Witch',            actorId: 'actor_demo_1', notes: 'TBD – double cast possibility' },
      { id: 'char_itw_6', name: 'Jack',                 actorId: 'actor_demo_4', notes: 'Character tenor' },
      { id: 'char_itw_7', name: 'The Wolf / Cinderella\'s Prince', actorId: 'actor_demo_6', notes: 'Double role' }
    ],
    acts: [
      {
        name: 'Act One',
        scenes: [
          { name: 'Prologue – Into the Woods', location: 'The Village', time: 'Once upon a time', description: 'Characters establish their wishes.', lighting: { fixtures: [], gels: [], cues: [] }, sound: { cues: [], music: [], equipment: [] }, wardrobe: { costumes: [], items: [] }, props: { items: [] }, set: { pieces: [], elements: [] } },
          { name: 'Scene 2 – The Baker\'s House', location: 'The Village', time: 'Morning', description: 'The Witch reveals the curse and the quest.', lighting: { fixtures: [], gels: [], cues: [] }, sound: { cues: [], music: [], equipment: [] }, wardrobe: { costumes: [], items: [] }, props: { items: [] }, set: { pieces: [], elements: [] } }
        ]
      },
      {
        name: 'Act Two',
        scenes: [
          { name: 'Scene 1 – Happily Ever After?', location: 'The Kingdom', time: 'One year later', description: 'Consequences of fulfilled wishes begin to surface.', lighting: { fixtures: [], gels: [], cues: [] }, sound: { cues: [], music: [], equipment: [] }, wardrobe: { costumes: [], items: [] }, props: { items: [] }, set: { pieces: [], elements: [] } }
        ]
      }
    ],
    createdAt: '2026-02-10T00:00:00.000Z',
    updatedAt: '2026-02-10T00:00:00.000Z'
  },
  {
    id: 'prod_demo_3',
    title: 'A Midsummer Night\'s Dream',
    director: 'Rebecca Hartley',
    startDate: '2025-10-03',
    endDate: '2025-10-26',
    status: 'Completed',
    description: 'Shakespeare\'s beloved comedy of enchanted forests, mischievous fairies, and lovers gone awry. Presented in a 1920s Art Deco reimagining.',
    venue: 'Riverside Community Theatre – Main Stage',
    characters: [
      { id: 'char_mnd_1', name: 'Puck',      actorId: 'actor_demo_4', notes: 'High energy, acrobatic' },
      { id: 'char_mnd_2', name: 'Titania',   actorId: 'actor_demo_1', notes: '' },
      { id: 'char_mnd_3', name: 'Oberon',    actorId: 'actor_demo_6', notes: '' },
      { id: 'char_mnd_4', name: 'Hermia',    actorId: 'actor_demo_3', notes: '' },
      { id: 'char_mnd_5', name: 'Helena',    actorId: 'actor_demo_5', notes: '' },
      { id: 'char_mnd_6', name: 'Bottom',    actorId: 'actor_demo_2', notes: 'Comic lead' }
    ],
    acts: [
      {
        name: 'Act One',
        scenes: [
          { name: 'Scene 1 – Athens', location: 'The Duke\'s Palace', time: 'Evening', description: 'The lovers\' conflict is established.', lighting: { fixtures: [], gels: [], cues: [] }, sound: { cues: [], music: [], equipment: [] }, wardrobe: { costumes: [], items: [] }, props: { items: [] }, set: { pieces: [], elements: [] } }
        ]
      }
    ],
    createdAt: '2025-08-01T00:00:00.000Z',
    updatedAt: '2025-10-27T00:00:00.000Z'
  }
];

// ─── Core Seed Function ───────────────────────────────────────────────────────

const seedAllDemoData = () => {
  localStorage.setItem('showsuite_donorLevels',  JSON.stringify(DEMO_DONOR_LEVELS));
  localStorage.setItem('showsuite_campaigns',     JSON.stringify(DEMO_CAMPAIGNS));
  localStorage.setItem('showsuite_contacts',      JSON.stringify(DEMO_CONTACTS));
  localStorage.setItem('showsuite_donations',     JSON.stringify(DEMO_DONATIONS));
  localStorage.setItem('showsuite_actors',        JSON.stringify(DEMO_ACTORS));
  localStorage.setItem('showsuite_productions',   JSON.stringify(DEMO_PRODUCTIONS));
  localStorage.setItem('showsuite_active_production', 'prod_demo_1');

  console.log('✅ Demo data seeded:');
  console.log('   - 5 Donor Levels');
  console.log('   - 4 Campaigns');
  console.log('   - 8 Contacts (6 donors)');
  console.log('   - 21 Donations');
  console.log('   - 8 Actors');
  console.log('   - 3 Productions (Tootsie, Into the Woods, A Midsummer Night\'s Dream)');
};

// ─── First-Run Init (skips if data already exists) ───────────────────────────

const initializeSampleData = () => {
  if (localStorage.getItem('showsuite_contacts') && localStorage.getItem('showsuite_productions')) {
    console.log('📦 Sample data already exists. Skipping initialization.');
    return false;
  }
  console.log('🌱 First-run: seeding demo data...');
  seedAllDemoData();
  return true;
};

// ─── Force Reset (always reseeds, used by Data Management settings) ──────────

const forceResetDemoData = () => {
  console.log('🔄 Force-resetting all demo data...');
  seedAllDemoData();
};

window.initializeSampleData  = initializeSampleData;
window.forceResetDemoData    = forceResetDemoData;
