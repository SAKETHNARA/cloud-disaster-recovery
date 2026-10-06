// List of all pages shown in the sidebar.
// 'phase' tells us which project phase will make the page work.
export const menuItems = [
  {
    path: '/',
    label: 'Dashboard',
    icon: '📊',
    description: 'Overview of backups, recoveries and storage.',
    phase: 12,
  },
  {
    path: '/backup',
    label: 'Backup Files',
    icon: '☁️',
    description: 'Select files and back them up to cloud storage.',
    phase: 7,
  },
  {
    path: '/history',
    label: 'Backup History',
    icon: '🕒',
    description: 'See every backup that has been created.',
    phase: 8,
  },
  {
    path: '/storage',
    label: 'Cloud Storage',
    icon: '🗄️',
    description: 'Check files and space used in the cloud bucket.',
    phase: 12,
  },
  {
    path: '/disaster',
    label: 'Disaster Simulation',
    icon: '🔥',
    description: 'Safely simulate data loss inside the demo folder.',
    phase: 9,
  },
  {
    path: '/restore',
    label: 'Restore Data',
    icon: '♻️',
    description: 'Recover lost files from the cloud backup.',
    phase: 10,
  },
  {
    path: '/recovery-history',
    label: 'Recovery History',
    icon: '📋',
    description: 'View recovery logs with RPO and RTO values.',
    phase: 11,
  },
  {
    path: '/status',
    label: 'System Status',
    icon: '🩺',
    description: 'Check whether backend, database and storage are online.',
    phase: 12,
  },
]