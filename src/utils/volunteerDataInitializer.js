const initializeVolunteerSampleData = () => {
  // Check if data already exists
  if (localStorage.getItem('contacts') && localStorage.getItem('volunteerOpportunities')) {
    console.log('📦 Volunteer data already exists. Skipping initialization.');
    return false;
  }

  console.log('🎭 Seeding volunteer sample data...');

  // Sample Volunteer Opportunities
  const opportunities = [
    {
      id: 'opp_1',
      title: 'Front of House Usher',
      category: 'Front of House',
      description: 'Greet patrons, distribute programs, assist with seating, answer questions',
      status: 'active',
      slotsPerShift: 4,
      requirements: ['Customer service skills', 'Professional appearance', 'Punctual'],
      createdAt: '2025-01-15',
      createdBy: 'Admin'
    },
    {
      id: 'opp_2',
      title: 'Box Office Assistant',
      category: 'Front of House',
      description: 'Assist with ticket sales, answer phone calls, handle will-call pickups',
      status: 'active',
      slotsPerShift: 2,
      requirements: ['Cash handling experience', 'Computer literacy', 'Phone etiquette'],
      createdAt: '2025-01-20',
      createdBy: 'Admin'
    },
    {
      id: 'opp_3',
      title: 'Concessions Staff',
      category: 'Front of House',
      description: 'Serve refreshments, handle cash/card transactions, maintain cleanliness',
      status: 'active',
      slotsPerShift: 3,
      requirements: ['Food handler certification preferred', 'Cash handling', 'Friendly demeanor'],
      createdAt: '2025-02-01',
      createdBy: 'Admin'
    },
    {
      id: 'opp_4',
      title: 'Stage Crew',
      category: 'Production',
      description: 'Assist with set changes, move props, help with quick changes backstage',
      status: 'active',
      slotsPerShift: 6,
      requirements: ['Physical stamina', 'Ability to lift 30+ lbs', 'Black clothing required'],
      createdAt: '2025-02-10',
      createdBy: 'Admin'
    },
    {
      id: 'opp_5',
      title: 'House Manager',
      category: 'Front of House',
      description: 'Oversee front of house operations, coordinate ushers, handle patron issues',
      status: 'active',
      slotsPerShift: 1,
      requirements: ['Leadership experience', 'Problem-solving skills', 'Theatre knowledge'],
      createdAt: '2025-02-15',
      createdBy: 'Admin'
    }
  ];

  // Sample Volunteers
  const volunteers = [
    {
      id: 'vol_1',
      firstName: 'Sarah',
      lastName: 'Mitchell',
      email: 'sarah.mitchell@email.com',
      phone: '555-0201',
      volunteerInfo: {
        status: 'active',
        availability: { friday: true, saturday: true, sunday: true },
        interests: ['Front of House', 'Box Office'],
        skills: ['Customer service', 'Cash handling'],
        totalHours: 45,
        joinedDate: '2024-09-01'
      }
    },
    {
      id: 'vol_2',
      firstName: 'Michael',
      lastName: 'Torres',
      email: 'mtorres@email.com',
      phone: '555-0202',
      volunteerInfo: {
        status: 'active',
        availability: { thursday: true, friday: true, saturday: true },
        interests: ['Production', 'Stage Crew'],
        skills: ['Technical theatre', 'Physical labor'],
        totalHours: 62,
        joinedDate: '2024-08-15'
      }
    },
    {
      id: 'vol_3',
      firstName: 'Jennifer',
      lastName: 'Park',
      email: 'jpark@email.com',
      phone: '555-0203',
      volunteerInfo: {
        status: 'active',
        availability: { friday: true, saturday: true },
        interests: ['Front of House', 'Concessions'],
        skills: ['Food service', 'Customer service'],
        totalHours: 38,
        joinedDate: '2024-10-01'
      }
    },
    {
      id: 'vol_4',
      firstName: 'David',
      lastName: 'Anderson',
      email: 'david.a@email.com',
      phone: '555-0204',
      volunteerInfo: {
        status: 'active',
        availability: { wednesday: true, thursday: true, friday: true, saturday: true },
        interests: ['Front of House', 'House Manager'],
        skills: ['Leadership', 'Problem solving', 'Theatre operations'],
        totalHours: 89,
        joinedDate: '2024-06-01'
      }
    },
    {
      id: 'vol_5',
      firstName: 'Lisa',
      lastName: 'Chang',
      email: 'lisa.chang@email.com',
      phone: '555-0205',
      volunteerInfo: {
        status: 'active',
        availability: { saturday: true, sunday: true },
        interests: ['Production', 'Stage Crew'],
        skills: ['Set construction', 'Technical skills'],
        totalHours: 51,
        joinedDate: '2024-09-15'
      }
    }
  ];

  // Sample Shifts (upcoming performances)
  const shifts = [
    {
      id: 'shift_1',
      opportunityId: 'opp_1',
      opportunityTitle: 'Front of House Usher',
      date: '2025-11-28',
      startTime: '18:30',
      endTime: '22:00',
      slotsNeeded: 4,
      slotsFilled: 3,
      status: 'open',
      assignedVolunteers: ['vol_1', 'vol_3', 'vol_4']
    },
    {
      id: 'shift_2',
      opportunityId: 'opp_2',
      opportunityTitle: 'Box Office Assistant',
      date: '2025-11-28',
      startTime: '18:00',
      endTime: '20:00',
      slotsNeeded: 2,
      slotsFilled: 1,
      status: 'open',
      assignedVolunteers: ['vol_1']
    },
    {
      id: 'shift_3',
      opportunityId: 'opp_4',
      opportunityTitle: 'Stage Crew',
      date: '2025-11-29',
      startTime: '18:00',
      endTime: '22:30',
      slotsNeeded: 6,
      slotsFilled: 4,
      status: 'open',
      assignedVolunteers: ['vol_2', 'vol_5', 'vol_4', 'vol_3']
    },
    {
      id: 'shift_4',
      opportunityId: 'opp_3',
      opportunityTitle: 'Concessions Staff',
      date: '2025-11-29',
      startTime: '18:30',
      endTime: '21:30',
      slotsNeeded: 3,
      slotsFilled: 2,
      status: 'open',
      assignedVolunteers: ['vol_3', 'vol_1']
    },
    {
      id: 'shift_5',
      opportunityId: 'opp_5',
      opportunityTitle: 'House Manager',
      date: '2025-11-30',
      startTime: '18:00',
      endTime: '22:00',
      slotsNeeded: 1,
      slotsFilled: 1,
      status: 'filled',
      assignedVolunteers: ['vol_4']
    }
  ];

  // Sample Applications
  const applications = [
    {
      id: 'app_1',
      volunteerId: null,
      firstName: 'Amanda',
      lastName: 'Rodriguez',
      email: 'arodriguez@email.com',
      phone: '555-0301',
      opportunityId: 'opp_1',
      opportunityTitle: 'Front of House Usher',
      status: 'pending',
      submittedAt: new Date('2025-11-20').getTime(),
      availability: { friday: true, saturday: true },
      experience: 'Volunteered at community events, customer service background',
      references: 'Available upon request'
    },
    {
      id: 'app_2',
      volunteerId: null,
      firstName: 'Brian',
      lastName: 'Thompson',
      email: 'bthompson@email.com',
      phone: '555-0302',
      opportunityId: 'opp_4',
      opportunityTitle: 'Stage Crew',
      status: 'pending',
      submittedAt: new Date('2025-11-21').getTime(),
      availability: { thursday: true, friday: true, saturday: true },
      experience: 'High school theatre tech crew, 2 years experience',
      references: 'Drama teacher: Mrs. Johnson, 555-9999'
    },
    {
      id: 'app_3',
      volunteerId: null,
      firstName: 'Carol',
      lastName: 'White',
      email: 'cwhite@email.com',
      phone: '555-0303',
      opportunityId: 'opp_3',
      opportunityTitle: 'Concessions Staff',
      status: 'pending',
      submittedAt: new Date('2025-11-22').getTime(),
      availability: { friday: true, saturday: true, sunday: true },
      experience: 'Food service experience, 5 years restaurant work',
      references: 'Former manager: John Smith, 555-8888'
    }
  ];

  // Save to localStorage
  localStorage.setItem('volunteerOpportunities', JSON.stringify(opportunities));
  localStorage.setItem('contacts', JSON.stringify(volunteers));
  localStorage.setItem('volunteerShifts', JSON.stringify(shifts));
  localStorage.setItem('volunteerApplications', JSON.stringify(applications));

  console.log('✅ Volunteer sample data initialized!');
  console.log('   - 5 Volunteer Opportunities');
  console.log('   - 5 Active Volunteers');
  console.log('   - 5 Upcoming Shifts');
  console.log('   - 3 Pending Applications');
  
  return true;
};

// Expose to window
if (typeof window !== 'undefined') {
  window.initializeVolunteerSampleData = initializeVolunteerSampleData;
}
