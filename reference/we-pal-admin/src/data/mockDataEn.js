export const currentUser = {
  id: 1,
  name: 'Amjad',
  fullName: 'Amjad Arqan',
  avatar: 'A',
  points: 420,
  level: 'Initiator',
  region: 'West Bank',
  bio: 'A Palestinian youth interested in research and community dialogue. I work on projects related to national reconciliation and the role of youth in state-building.',
  role: 'admin',
};

export const stats = {
  activeProjects: 3,
  activeTasks: 7,
  points: 420,
  coursesCompleted: '2/2',
};

export const dashboardTasks = [
  { id: 1, title: 'Review the first draft', project: 'Research Paper', dueDate: 'March 10', completed: false },
  { id: 2, title: 'Complete Athar Course 1', project: 'Core Requirement', dueDate: 'March 5', completed: true },
  { id: 3, title: 'Design the third slide', project: 'Infographic', dueDate: 'March 12', completed: false },
  { id: 4, title: 'Record interview with Ahmad', project: 'Podcast', dueDate: 'March 18', completed: false },
];

export const activityFeed = [
  { id: 1, user: 'Sara', avatar: 'S', color: '#E8F5E9', action: 'completed phase two of', target: 'Research Paper: Youth Role', time: '2 hours ago' },
  { id: 2, user: 'Mohammed', avatar: 'M', color: '#E3F2FD', action: 'joined the project', target: 'Youth Dialogues Across Communities', time: '4 hours ago' },
  { id: 3, user: 'Lina', avatar: 'L', color: '#FFF3E0', action: 'earned the badge', target: 'Initiative Leader', time: 'Yesterday' },
  { id: 4, user: 'Ahmad', avatar: 'H', color: '#F3E5F5', action: 'published a new file in', target: 'Podcast: Youth Voices', time: 'Yesterday' },
];

export const projects = [
  {
    id: 1,
    title: 'Research Paper: The Role of Youth in National Reconciliation',
    track: 'Research',
    status: 'In Progress',
    progress: 65,
    members: 5,
    deadline: 'April 15',
    description: 'An in-depth analysis of Palestinian youth experiences in national reconciliation pathways, focusing on community dialogues and youth-led initiatives.',
    team: [
      { name: 'Amjad', avatar: 'A', role: 'Leader' },
      { name: 'Sara', avatar: 'S', role: 'Researcher' },
      { name: 'Mohammed', avatar: 'M', role: 'Researcher' },
      { name: 'Lina', avatar: 'L', role: 'Designer' },
      { name: 'Ahmad', avatar: 'H', role: 'Researcher' },
    ],
    currentStage: 2,
  },
  {
    id: 2,
    title: 'Initiative: Youth Dialogues Across Communities',
    track: 'Initiatives',
    status: 'Planning',
    progress: 30,
    members: 8,
    deadline: 'May 1',
    description: 'An initiative to organize dialogue sessions between youth from Gaza and the West Bank on reconciliation issues.',
    team: [
      { name: 'Mohammed', avatar: 'M', role: 'Leader' },
      { name: 'Sara', avatar: 'S', role: 'Coordinator' },
    ],
    currentStage: 1,
  },
  {
    id: 3,
    title: 'Infographic: The Two-State Solution Pathway',
    track: 'Digital Content',
    status: 'Review',
    progress: 90,
    members: 3,
    deadline: 'March 20',
    description: 'An illustrative infographic of the two-state solution pathway and its key historical milestones.',
    team: [
      { name: 'Lina', avatar: 'L', role: 'Designer' },
      { name: 'Amjad', avatar: 'A', role: 'Researcher' },
      { name: 'Ahmad', avatar: 'H', role: 'Reviewer' },
    ],
    currentStage: 3,
  },
  {
    id: 4,
    title: 'Podcast: Youth Voices from Palestine',
    track: 'Digital Content',
    status: 'Idea',
    progress: 10,
    members: 4,
    deadline: 'May 30',
    description: 'A podcast series hosting Palestinian youth who speak about their experiences in dialogue and reconciliation.',
    team: [
      { name: 'Ahmad', avatar: 'H', role: 'Leader' },
      { name: 'Sara', avatar: 'S', role: 'Interviewer' },
    ],
    currentStage: 0,
  },
];

export const projectTasks = [
  { id: 1, title: 'Gather sources and references', assignee: 'Sara', status: 'Completed', dueDate: 'March 1' },
  { id: 2, title: 'Write the theoretical framework', assignee: 'Amjad', status: 'In Progress', dueDate: 'March 10' },
  { id: 3, title: 'Conduct interviews', assignee: 'Mohammed', status: 'In Progress', dueDate: 'March 15' },
  { id: 4, title: 'Analyze data', assignee: 'Lina', status: 'Not Started', dueDate: 'March 25' },
  { id: 5, title: 'Final review', assignee: 'Team', status: 'Not Started', dueDate: 'April 10' },
];

export const workspaceLinks = [
  { id: 1, title: 'Research Draft', type: 'docs', platform: 'Google Docs', description: 'Theoretical framework and methodology', url: '#' },
  { id: 2, title: 'Survey Data', type: 'sheets', platform: 'Google Sheets', description: 'Responses from 127 participants', url: '#' },
  { id: 3, title: 'Cover Design', type: 'canva', platform: 'Canva', description: 'Final design', url: '#' },
  { id: 4, title: 'Team Files', type: 'drive', platform: 'Google Drive', description: 'All project files', url: '#' },
];

export const ideas = [
  { id: 1, title: 'Focus on reconciliation experiences in Ireland', description: 'A comparative study with the Northern Ireland experience', author: 'Sara', avatar: 'S', votes: 12, label: 'Important' },
  { id: 2, title: 'Conduct interviews with youth leaders', description: 'In-depth interviews with 10 youth leaders', author: 'Mohammed', avatar: 'M', votes: 8, label: 'Important' },
  { id: 3, title: 'Analyze the role of social media', description: 'The impact of social media on youth dialogue', author: 'Lina', avatar: 'L', votes: 5, label: 'Normal' },
  { id: 4, title: 'Compare with South Africa experience', description: 'Lessons learned from the reconciliation experience', author: 'Ahmad', avatar: 'H', votes: 3, label: 'Normal' },
];

export const references = [
  { id: 1, title: 'UN Security Council Resolution 242', type: 'Document', notes: 'Core resolution', addedBy: 'Sara' },
  { id: 2, title: 'Youth Guide to Understanding the Two-State Solution', type: 'Guide', notes: 'Key reference', addedBy: 'Amjad' },
  { id: 3, title: 'Youth and Peacebuilding - UNDP Report', type: 'Report', notes: 'International experiences', addedBy: 'Mohammed' },
];

export const templates = [
  { id: 1, title: 'Research Paper Template', icon: '📄', format: 'Word', description: 'Introduction, problem, methodology, findings, recommendations' },
  { id: 2, title: 'Initiative Proposal Template', icon: '📋', format: 'Word', description: 'Problem, solution, audience, implementation plan' },
  { id: 3, title: 'Podcast Script Template', icon: '🎙', format: 'Word', description: 'Introduction, topics, questions, conclusion' },
  { id: 4, title: 'Infographic Design Guidelines', icon: '🎨', format: 'PDF', description: 'Dimensions, colors, tips' },
];

export const projectFiles = [
  { id: 1, name: 'Theoretical Framework Draft.docx', type: 'docx', size: '2.3 MB', uploader: 'Sara', date: '3 days ago' },
  { id: 2, name: 'Sources List.pdf', type: 'pdf', size: '450 KB', uploader: 'Amjad', date: '5 days ago' },
  { id: 3, name: 'Interview Template.docx', type: 'docx', size: '1.1 MB', uploader: 'Mohammed', date: '1 week ago' },
];

export const discussions = [
  { id: 1, user: 'Sara', avatar: 'S', time: '2 hours ago', text: 'I finished reviewing Chapter 2 — there are some notes on the methodology. I sent the comments on Google Docs.' },
  { id: 2, user: 'Mohammed', avatar: 'M', time: '4 hours ago', text: 'Great, I will check it tonight. By the way, the interview with Dr. Ahmad has been postponed to Thursday.' },
  { id: 3, user: 'Amjad', avatar: 'A', time: 'Yesterday', text: 'Excellent, Sara. Mohammed, no problem with the postponement. Let us focus on finishing the theoretical framework this week.' },
];

export const communityGroups = [
  { id: 1, name: 'Gaza Group', members: 340, posts: 128, color: '#E8F5E9' },
  { id: 2, name: 'West Bank Group', members: 360, posts: 145, color: '#E3F2FD' },
  { id: 3, name: 'Researchers', members: 85, posts: 67, color: '#FFF3E0' },
  { id: 4, name: 'Content Creators', members: 120, posts: 89, color: '#F3E5F5' },
];

export const badges = [
  { id: 1, icon: '🚀', title: 'Initiator', description: 'Created your first project', color: '#FFF3E0' },
  { id: 2, icon: '📝', title: 'Researcher', description: 'Completed a research paper', color: '#E8F5E9' },
  { id: 3, icon: '🎓', title: 'Learner', description: 'Completed Athar courses', color: '#E3F2FD' },
  { id: 4, icon: '⭐', title: 'Reviewer', description: 'Evaluated 3 projects', color: '#F3E5F5' },
];

export const consultations = {
  active: {
    title: 'Palestinian Youth Priorities for State-Building',
    dateRange: 'March 1–15, 2026',
    participation: { current: 423, total: 700 },
    status: 'Active',
  },
  past: [
    { id: 1, title: 'What Makes Cross-Community Dialogue Effective?', participants: 389, status: 'Completed' },
    { id: 2, title: 'Youth Priorities in Education and Employment', participants: 456, status: 'Completed' },
  ],
};

export const chatMessages = [
  { id: 1, sender: 'user', text: 'Help me shape a project idea about the role of youth in reconciliation' },
  {
    id: 2,
    sender: 'bot',
    text: 'You can start by identifying a main focus for the project. Based on resources available on the platform, I suggest focusing on one of these topics:\n\n1. Successful youth experiences in reconciliation dialogues\n2. The role of social media in promoting youth dialogue\n3. Comparing international experiences in youth engagement\n\nWould you like me to direct you to related resources on any of these topics?',
  },
  { id: 3, sender: 'user', text: 'Yes, the first topic seems suitable' },
  {
    id: 4,
    sender: 'bot',
    text: 'Excellent! Here are some resources available on the platform:\n\n📄 Youth Guide to Understanding the Two-State Solution\n📄 Policy Paper: Youth and State-Building\n\nI suggest you start by:\n- Defining 3–5 research questions\n- Forming a team of 3–4 members\n- Setting a timeline of 6–8 weeks\n\nWould you like help formulating the research questions?',
  },
];

export const surveys = [
  { id: 1, title: 'Member Satisfaction Survey — Q1 2026', type: 'Quarterly', participated: 234, total: 700, deadline: 'March 30' },
  { id: 2, title: 'Vote: Topic for the Next Challenge', type: 'Vote', participated: 456, total: 700, deadline: 'March 20' },
  { id: 3, title: 'Activity Cycle 2 Evaluation', type: 'Activity Evaluation', participated: 89, total: 120, deadline: 'March 25' },
];

export const publicResources = [
  { id: 1, title: 'UN Security Council Resolution 242', type: 'Document', views: 1240, downloads: 380 },
  { id: 2, title: 'Youth Guide to Understanding the Two-State Solution', type: 'Guide', views: 2100, downloads: 890 },
  { id: 3, title: 'Video: History of the Palestinian Cause', type: 'Video', views: 3400, downloads: 0 },
  { id: 4, title: 'Policy Paper: Youth and State-Building', type: 'Research Paper', views: 780, downloads: 210 },
];

export const youthStories = [
  { id: 1, name: 'Sara', avatar: 'S', text: 'The platform helped me connect with youth from Gaza for the first time and we built a research paper together' },
  { id: 2, name: 'Mohammed', avatar: 'M', text: 'The experience of working collectively on the community initiative changed my perspective on dialogue' },
  { id: 3, name: 'Lina', avatar: 'L', text: 'The research track and peer review developed my skills in ways I never expected' },
];

export const conversations = [
  { id: 1, user: 'Sara', avatar: 'S', lastMessage: 'Ok, we will submit the draft tomorrow', time: '5 minutes ago', unread: 2 },
  { id: 2, user: 'Mohammed', avatar: 'M', lastMessage: 'Thank you for the feedback', time: '1 hour ago', unread: 0 },
  { id: 3, user: 'Lina', avatar: 'L', lastMessage: 'The survey is ready to distribute', time: 'Yesterday', unread: 0 },
];

export const adminStats = {
  activeUsers: 687,
  activeProjects: 42,
  engagementRate: 78,
  pendingReports: 12,
};

export const adminUsers = [
  { id: 1, name: 'Sara Ahmad', email: 'sara@example.com', region: 'Gaza', role: 'Member', status: 'Active' },
  { id: 2, name: 'Mohammed Khaled', email: 'mohammed@example.com', region: 'West Bank', role: 'Member', status: 'Active' },
  { id: 3, name: 'Lina Omar', email: 'lina@example.com', region: 'Gaza', role: 'Member', status: 'Active' },
  { id: 4, name: 'Ahmad Said', email: 'ahmad@example.com', region: 'West Bank', role: 'Moderator', status: 'Active' },
];

export const reports = [
  { id: 1, content: 'Inappropriate comment in the discussion', reporter: 'Sara', reason: 'Offensive Content', date: '2 hours ago' },
  { id: 2, content: 'Unsuitable profile picture', reporter: 'Mohammed', reason: 'Inappropriate Content', date: '5 hours ago' },
  { id: 3, content: 'Repeated messages (spam)', reporter: 'Lina', reason: 'Spam', date: 'Yesterday' },
];

export const surveyQuestions = [
  {
    id: 1,
    text: 'What is the most important focus for national reconciliation?',
    type: 'Single Choice',
    options: ['Direct Dialogue', 'Joint Education', 'Joint Projects', 'Unified Media'],
    results: [35, 28, 22, 15],
  },
  {
    id: 2,
    text: 'How often do you participate in dialogue activities per month?',
    type: 'Single Choice',
    options: ['Once', '2–3 times', '4+ times', 'I do not participate'],
    results: [40, 30, 15, 15],
  },
  {
    id: 3,
    text: 'What are the main challenges you face?',
    type: 'Multiple Choice',
    options: ['Weak internet', 'Lack of time', 'Limited resources', 'Coordination difficulties'],
    results: [45, 55, 30, 40],
  },
];

// ===== Public Portal Data =====

export const platformStats = {
  members: 700,
  projects: 42,
  resources: 156,
  communities: 4,
  regions: 'Gaza and the West Bank',
};

export const libraryResources = [
  { id: 1, title: 'UN Security Council Resolution 242', type: 'Document', views: 1240, downloads: 380, description: 'The resolution issued in 1967, considered the legal basis for peace negotiations. It addresses withdrawal from occupied territories and the right of every state in the region to live in peace.', date: 'January 15, 2026', author: 'United Nations', category: 'Documents' },
  { id: 2, title: 'Youth Guide to Understanding the Two-State Solution', type: 'Guide', views: 2100, downloads: 890, description: 'A comprehensive guide explaining the two-state solution in simple language, including illustrative maps and a timeline of key events with discussion questions.', date: 'February 3, 2026', author: 'Platform Team', category: 'Guides' },
  { id: 3, title: 'Video: History of the Palestinian Cause', type: 'Video', views: 3400, downloads: 0, description: 'A documentary series of 5 episodes narrating the history of the Palestinian cause from 1917 to the present, in a modern visual style.', date: 'February 20, 2026', author: 'Content Team', category: 'Video' },
  { id: 4, title: 'Policy Paper: Youth and State-Building', type: 'Research Paper', views: 780, downloads: 210, description: 'A research paper analyzing the role of Palestinian youth in building state institutions, with practical recommendations for decision-makers.', date: 'March 10, 2026', author: 'Sara Ahmad', category: 'Research' },
  { id: 5, title: 'Report: International Reconciliation Experiences', type: 'Report', views: 650, downloads: 180, description: 'A comparative study of reconciliation experiences in Northern Ireland, South Africa, and Rwanda, with lessons learned for the Palestinian context.', date: 'March 1, 2026', author: 'Mohammed Khaled', category: 'Research' },
  { id: 6, title: 'Infographic: The Two-State Solution Pathway', type: 'Infographic', views: 1900, downloads: 540, description: 'A visual design illustrating the key milestones in the two-state solution pathway from Oslo to the present.', date: 'February 25, 2026', author: 'Lina Omar', category: 'Visual Content' },
  { id: 7, title: 'Podcast: Youth Voices — Episode One', type: 'Podcast', views: 890, downloads: 320, description: 'The first episode of a podcast series hosting Palestinian youth who speak about their experiences in community dialogue.', date: 'March 18, 2026', author: 'Ahmad Said', category: 'Podcast' },
  { id: 8, title: 'Guide to Organizing Community Dialogues', type: 'Guide', views: 1100, downloads: 430, description: 'A practical step-by-step guide for organizing effective community dialogue sessions, including ready-to-use templates and tools.', date: 'March 5, 2026', author: 'Platform Team', category: 'Guides' },
];

export const blogPosts = [
  { id: 1, title: 'How Community Dialogue Changed My View on Reconciliation', excerpt: 'My personal experience in dialogue sessions between youth from Gaza and the West Bank, and how my convictions about the possibility of national reconciliation changed...', author: 'Sara Ahmad', avatar: 'S', date: 'March 25, 2026', readTime: '5 min', category: 'Experiences', image: null, content: 'When I first joined the platform, I was skeptical about the possibility of having a real dialogue between youth from Gaza and the West Bank. But after participating in three dialogue sessions, I realized that our common ground is far greater than I had expected.\n\nThe first session was difficult — there was obvious tension and a lack of trust. But the moderators succeeded in creating a safe space for everyone.\n\nIn the second session, we began talking about our shared dreams: education, job opportunities, and freedom. We discovered that our challenges are similar despite the difference in our circumstances.\n\nBy the third session, we were working together on a joint research paper about the role of youth in reconciliation. This experience proved to me that dialogue is possible, and that youth are capable of building real bridges.' },
  { id: 2, title: 'Lessons from the Northern Ireland Reconciliation Experience', excerpt: 'An analysis of the Northern Ireland reconciliation experience and what we can learn from it in the Palestinian context...', author: 'Mohammed Khaled', avatar: 'M', date: 'March 20, 2026', readTime: '8 min', category: 'Research', image: null, content: 'The Northern Ireland experience is considered one of the most successful reconciliation experiences in the modern world. After decades of sectarian conflict, the Irish succeeded in building sustainable peace through several pathways.\n\nLesson one: The importance of involving youth in the peace process from the very beginning.\n\nLesson two: Direct dialogue between conflicting communities is necessary for building trust.\n\nLesson three: Joint projects create mutual interests that support peace.\n\nLesson four: Patience and continuity — reconciliation is a long process that requires generations.' },
  { id: 3, title: 'My First Infographic: A Learning Journey', excerpt: 'How I learned infographic design from scratch through the platform and produced visual content about the two-state solution...', author: 'Lina Omar', avatar: 'L', date: 'March 15, 2026', readTime: '4 min', category: 'Experiences', image: null, content: 'I knew nothing about design before joining the platform. All I had was a passion for the Palestinian cause and a desire to convey information in a simplified way.\n\nI started learning design basics through Athar courses, then joined the digital content track.\n\nThe first project was designing an infographic about the two-state solution pathway. It took 6 weeks of research, design, and review.\n\nThe result: an infographic that received more than 1,900 views on the platform!' },
  { id: 4, title: 'The Podcast as a Dialogue Tool: The Youth Voices Experience', excerpt: 'How we launched a podcast series to convey Palestinian youth voices and promote community dialogue...', author: 'Ahmad Said', avatar: 'H', date: 'March 10, 2026', readTime: '6 min', category: 'Initiatives', image: null, content: 'The podcast idea was born from a simple question: how do we reach the largest possible audience with Palestinian youth voices?\n\nWe formed a team of 4 members and started recording the first episode. The challenges were many — from audio quality to convincing guests to participate.\n\nBut the result was worth the effort: real episodes with real youth voices speaking about reconciliation, hope, and challenges.' },
  { id: 5, title: 'Survey: Palestinian Youth Priorities 2026', excerpt: 'Results of a survey participated in by 456 young men and women about their priorities in education, employment, and state-building...', author: 'Platform Team', avatar: 'T', date: 'March 5, 2026', readTime: '7 min', category: 'Research', image: null, content: 'We conducted a comprehensive survey participated in by 456 platform members. The results revealed clear priorities:\n\n1. Quality education (78%)\n2. Job opportunities (72%)\n3. Political participation (65%)\n4. National reconciliation (61%)\n5. Civil liberties (58%)\n\nThe surprise: 84% of participants believe that cross-community dialogue is both possible and necessary.' },
  { id: 6, title: 'Peer Review: How to Evaluate Each Other Objectively', excerpt: 'A practical guide to the peer review system adopted on the platform and how it contributes to improving the quality of outputs...', author: 'Amjad Arqan', avatar: 'A', date: 'March 1, 2026', readTime: '5 min', category: 'Guides', image: null, content: 'The platform peer review system is based on 5 criteria: clarity, depth, creativity, documentation, and overall quality.\n\nEvery project that reaches the review stage is evaluated by at least two different teams.\n\nThe goal is not criticism, but shared improvement. The result: a notable 35% improvement in output quality after implementing the system.' },
];

export const expandedYouthStories = [
  { id: 1, name: 'Sara Ahmad', avatar: 'S', region: 'Gaza', shortText: 'The platform helped me connect with youth from the West Bank for the first time and we built a research paper together', fullText: 'When I joined the platform, the idea was mere curiosity. But after the first dialogue session, I realized this platform was different. It helped me connect with youth from the West Bank for the first time in my life. We built a team of 5 members and worked on a research paper about the role of youth in reconciliation. The experience completely changed my perspective.', projectTitle: 'Research Paper: The Role of Youth in Reconciliation', badge: 'Researcher' },
  { id: 2, name: 'Mohammed Khaled', avatar: 'M', region: 'West Bank', shortText: 'The experience of working collectively on the community initiative changed my perspective on dialogue', fullText: 'I used to believe that cross-community dialogue was impossible. But the platform proved otherwise. The experience of working collectively on the Youth Dialogues initiative taught me that cooperation is possible even in the most difficult circumstances. Today I lead a team of 8 members from Gaza and the West Bank.', projectTitle: 'Initiative: Youth Dialogues Across Communities', badge: 'Initiative Leader' },
  { id: 3, name: 'Lina Omar', avatar: 'L', region: 'Gaza', shortText: 'The research track and peer review developed my skills in ways I never expected', fullText: 'Before the platform, I did not know how to write a research paper or design an infographic. Today, I am a designer on a digital content team and worked on an infographic that received more than 1,900 views. The peer review system helped me develop quickly.', projectTitle: 'Infographic: The Two-State Solution Pathway', badge: 'Designer' },
  { id: 4, name: 'Ahmad Said', avatar: 'H', region: 'West Bank', shortText: 'We launched a podcast that brings Palestinian youth voices to the world', fullText: 'The podcast idea was born in a brainstorming session on the platform. Within two months, we recorded 4 episodes hosting youth from Gaza and the West Bank. The podcast became a platform for voices that had never been heard before.', projectTitle: 'Podcast: Youth Voices from Palestine', badge: 'Podcast Producer' },
  { id: 5, name: 'Noor Hassan', avatar: 'N', region: 'Gaza', shortText: 'Athar courses opened new horizons for me in understanding the cause', fullText: 'The Athar courses on the platform were a turning point. I learned things about the history of the Palestinian cause that I did not know before. The knowledge gave me greater confidence in discussion and dialogue with others.', projectTitle: null, badge: 'Learner' },
];

export const groupDetails = {
  1: {
    name: 'Gaza Group', description: 'A group dedicated to Gaza youth participating in the dialogue and initiatives program', members: 340, posts: 128, color: '#E8F5E9',
    membersList: [
      { name: 'Sara Ahmad', avatar: 'S', role: 'Moderator', projects: 3 },
      { name: 'Lina Omar', avatar: 'L', role: 'Member', projects: 2 },
      { name: 'Noor Hassan', avatar: 'N', role: 'Member', projects: 1 },
    ],
    recentPosts: [
      { author: 'Sara', text: 'We finished reviewing Chapter 2 of the research paper! The results are promising.', time: '2 hours ago', likes: 12 },
      { author: 'Lina', text: 'Who wants to join the upcoming design workshop? Spots are limited.', time: '5 hours ago', likes: 8 },
      { author: 'Noor', text: 'I participated in the second Athar course and it was excellent! I recommend everyone to complete it.', time: 'Yesterday', likes: 15 },
    ],
  },
  2: {
    name: 'West Bank Group', description: 'A group dedicated to West Bank youth participating in the program', members: 360, posts: 145, color: '#E3F2FD',
    membersList: [
      { name: 'Mohammed Khaled', avatar: 'M', role: 'Moderator', projects: 4 },
      { name: 'Ahmad Said', avatar: 'H', role: 'Member', projects: 2 },
      { name: 'Amjad Arqan', avatar: 'A', role: 'Member', projects: 3 },
    ],
    recentPosts: [
      { author: 'Mohammed', text: 'The next dialogue session is on Thursday. Who will attend?', time: '3 hours ago', likes: 20 },
      { author: 'Ahmad', text: 'We recorded the second podcast episode today!', time: 'Yesterday', likes: 18 },
    ],
  },
  3: {
    name: 'Researchers', description: 'A group for researchers and those interested in the research track', members: 85, posts: 67, color: '#FFF3E0',
    membersList: [
      { name: 'Sara Ahmad', avatar: 'S', role: 'Lead Researcher', projects: 3 },
      { name: 'Amjad Arqan', avatar: 'A', role: 'Researcher', projects: 2 },
    ],
    recentPosts: [
      { author: 'Sara', text: 'Excellent new source on international reconciliation experiences. I added it to the library.', time: '1 hour ago', likes: 7 },
    ],
  },
  4: {
    name: 'Content Creators', description: 'A group for digital content creators — design, podcast, and video', members: 120, posts: 89, color: '#F3E5F5',
    membersList: [
      { name: 'Lina Omar', avatar: 'L', role: 'Designer', projects: 2 },
      { name: 'Ahmad Said', avatar: 'H', role: 'Podcast Producer', projects: 1 },
    ],
    recentPosts: [
      { author: 'Lina', text: 'The new infographic is ready for review!', time: '4 hours ago', likes: 11 },
    ],
  },
};

export const consultationReports = [
  {
    id: 1, title: 'What Makes Cross-Community Dialogue Effective?', participants: 389, date: 'January 2026',
    summary: 'The consultation results showed broad consensus on the importance of mutual respect and active listening as the foundation for successful dialogue.',
    topStatements: [
      { text: 'Mutual respect is the foundation of any successful dialogue', agree: 89, disagree: 5 },
      { text: 'Dialogue should take place in a safe space without pre-judgments', agree: 85, disagree: 8 },
      { text: 'Joint projects are more effective than theoretical dialogue', agree: 78, disagree: 12 },
      { text: 'Social media can be an effective dialogue tool', agree: 52, disagree: 35 },
    ],
    groups: [
      { name: 'Consensus Group', percentage: 65, description: 'Support direct dialogue and joint projects' },
      { name: 'Cautious Group', percentage: 25, description: 'Support dialogue but with conditions and guarantees' },
      { name: 'Skeptical Group', percentage: 10, description: 'Doubt the effectiveness of dialogue at this time' },
    ],
  },
  {
    id: 2, title: 'Youth Priorities in Education and Employment', participants: 456, date: 'February 2026',
    summary: 'The consultation revealed that youth place quality education and job opportunities at the top of their priorities, with an emphasis on the importance of digital skills.',
    topStatements: [
      { text: 'Quality education is the key to a better future', agree: 92, disagree: 3 },
      { text: 'We need more vocational training programs than university degrees', agree: 61, disagree: 28 },
      { text: 'Digital skills are essential for the modern job market', agree: 88, disagree: 6 },
      { text: 'Entrepreneurship is better than a traditional job', agree: 45, disagree: 40 },
    ],
    groups: [
      { name: 'Education First Group', percentage: 55, description: 'Prioritize academic education' },
      { name: 'Practical Skills Group', percentage: 35, description: 'Prefer vocational and practical training' },
      { name: 'Entrepreneurship Group', percentage: 10, description: 'Believe in freelancing and private projects' },
    ],
  },
];

// ===== News and Updates =====

export const newsItems = [
  { id: 1, title: 'Launch of Activity Cycle 3 for 2026', excerpt: 'The platform announces the start of a new cycle of youth activities and challenges, with 3 new work tracks and topics focusing on state-building.', date: 'March 28, 2026', category: 'Announcement' },
  { id: 2, title: 'Results of the Palestinian Youth Priorities Consultation', excerpt: '456 members participated in a Pol.is consultation on youth priorities. The results revealed broad consensus on education and employment.', date: 'March 22, 2026', category: 'Results' },
  { id: 3, title: 'Training Workshop: Scientific Research Fundamentals', excerpt: 'A free workshop for platform members on scientific research methodologies and analysis tools. Register now!', date: 'March 18, 2026', category: 'Event' },
  { id: 4, title: '"Youth Voices" Project Reaches 3,000 Views', excerpt: 'The podcast series produced by a team of 4 members achieves great success and reaches a wide audience outside the platform.', date: 'March 15, 2026', category: 'Achievement' },
  { id: 5, title: 'New Partnership with CMI Finland', excerpt: 'Signing a new partnership agreement to support community dialogue tracks and provide additional resources for members.', date: 'March 10, 2026', category: 'Partnership' },
  { id: 6, title: 'Platform Update: New Project Tools', excerpt: 'Adding the Ideas Board, Survey Builder, and Source Tracker as integrated tools within the project page.', date: 'March 5, 2026', category: 'Update' },
];

// ===== Public Polls =====

export const publicPolls = [
  { id: 1, question: 'What is the most important priority for Palestinian youth today?', options: [{ text: 'Quality Education', votes: 234 }, { text: 'Job Opportunities', votes: 198 }, { text: 'National Reconciliation', votes: 156 }, { text: 'Civil Liberties', votes: 112 }], totalVotes: 700, active: true },
  { id: 2, question: 'Do you believe that dialogue between youth from Gaza and the West Bank is possible and effective?', options: [{ text: 'Yes, definitely', votes: 412 }, { text: 'Possible with conditions', votes: 198 }, { text: 'Difficult currently', votes: 67 }, { text: 'Not possible', votes: 23 }], totalVotes: 700, active: true },
  { id: 3, question: 'What is the best form of output for youth projects?', options: [{ text: 'Research Papers', votes: 145 }, { text: 'Podcast and Video', votes: 267 }, { text: 'Infographics', votes: 189 }, { text: 'Field Initiatives', votes: 99 }], totalVotes: 700, active: false },
];

// ===== Notifications =====

export const notifications = [
  { id: 1, type: 'project', text: 'Sara added a new comment in "Research Paper: Youth Role"', time: '10 minutes ago', read: false },
  { id: 2, type: 'community', text: 'Mohammed published a new post in the West Bank Group', time: '30 minutes ago', read: false },
  { id: 3, type: 'survey', text: 'New survey: "Activity Cycle 2 Evaluation" — participate now', time: '1 hour ago', read: false },
  { id: 4, type: 'project', text: 'Task "Write the Theoretical Framework" is due in two days', time: '2 hours ago', read: true },
  { id: 5, type: 'community', text: 'Lina earned the "Designer" badge — congratulate her!', time: '3 hours ago', read: true },
  { id: 6, type: 'project', text: 'The "Infographic" project was promoted to the Review stage', time: '5 hours ago', read: true },
  { id: 7, type: 'survey', text: 'Results of the "Topic for the Next Challenge" survey are now available', time: 'Yesterday', read: true },
  { id: 8, type: 'community', text: 'Ahmad invited you to join the "Podcast: Youth Voices" project', time: 'Yesterday', read: true },
];

// ===== FAQ =====

export const faqItems = [
  { question: 'What is the We-Pal platform?', answer: 'We-Pal is a collaborative platform connecting 700 Palestinian youth from Gaza, the West Bank, and Cairo to work together on research projects, community initiatives, and digital content that promotes dialogue and reconciliation.' },
  { question: 'How can I join?', answer: 'To join, you need to complete two courses on the Athar platform (athronline.com), then obtain an invitation code from the Social Developmental Forum (SDF). After that, you can register your account and get started.' },
  { question: 'Is the platform free?', answer: 'Yes, the platform is completely free for all approved members. There are no subscription fees or hidden costs.' },
  { question: 'What tracks are available?', answer: 'There are 3 tracks: the Research Track (research papers and policy papers), the Initiatives Track (community and dialogue initiatives), and the Digital Content Track (podcast, video, infographic).' },
  { question: 'How does the peer review system work?', answer: 'When your project reaches the review stage, it is evaluated by at least two other teams according to 5 criteria: clarity, depth, creativity, documentation, and overall quality. The goal is shared improvement, not criticism.' },
  { question: 'Can I participate from outside Palestine?', answer: 'The platform is currently open to Palestinian youth in Gaza, the West Bank, and Cairo. We are working to expand the scope of participation in the future.' },
];

// ===== Additional Admin Data =====

export const adminActivities = [
  { id: 1, title: 'Challenge: Youth Solutions for Education', status: 'Active', type: 'Challenge', proposals: 12, startDate: 'March 1, 2026', endDate: 'April 30, 2026' },
  { id: 2, title: 'Call: Community Dialogue Initiatives', status: 'Active', type: 'Call', proposals: 8, startDate: 'February 15, 2026', endDate: 'April 15, 2026' },
  { id: 3, title: 'Challenge: Digital Content on the Cause', status: 'Completed', type: 'Challenge', proposals: 15, startDate: 'January 1, 2026', endDate: 'February 28, 2026' },
  { id: 4, title: 'Call: Research on the Two-State Solution', status: 'Upcoming', type: 'Call', proposals: 0, startDate: 'May 1, 2026', endDate: 'June 30, 2026' },
];

export const adminLibraryItems = [
  { id: 1, title: 'UN Security Council Resolution 242', category: 'Documents', status: 'Published', views: 1240, date: 'January 15, 2026' },
  { id: 2, title: 'Youth Guide to Understanding the Two-State Solution', category: 'Guides', status: 'Published', views: 2100, date: 'February 3, 2026' },
  { id: 3, title: 'Research Paper: Reconciliation Experiences', category: 'Research', status: 'Draft', views: 0, date: 'March 25, 2026' },
  { id: 4, title: 'Podcast: Episode Three', category: 'Podcast', status: 'Under Review', views: 0, date: 'March 28, 2026' },
];

export const adminPublishQueue = [
  { id: 1, title: 'Research Paper: The Role of Youth in National Reconciliation', type: 'Research Paper', team: 'Amjad, Sara, Mohammed', status: 'Ready to Publish', rating: 4.5 },
  { id: 2, title: 'Infographic: The Two-State Solution Pathway', type: 'Infographic', team: 'Lina, Amjad, Ahmad', status: 'In Editing', rating: 4.2 },
  { id: 3, title: 'Podcast: Youth Voices — Episode 2', type: 'Podcast', team: 'Ahmad, Sara', status: 'Under Review', rating: null },
];

export const adminAnalytics = {
  kpis: [
    { label: 'Project Completion Rate', value: '73%', trend: '+5%' },
    { label: 'Average Project Duration', value: '6.2 weeks', trend: '-0.8' },
    { label: 'Consultation Participation Rate', value: '61%', trend: '+12%' },
    { label: 'Outputs Published This Quarter', value: '8', trend: '+3' },
  ],
  monthlyActivity: [
    { month: 'January', projects: 8, outputs: 2, consultations: 1 },
    { month: 'February', projects: 12, outputs: 3, consultations: 1 },
    { month: 'March', projects: 15, outputs: 5, consultations: 2 },
  ],
};
