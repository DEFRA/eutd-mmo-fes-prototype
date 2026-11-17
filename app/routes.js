//
// For guidance on how to create routes see:
// https://prototype-kit.service.gov.uk/docs/create-routes
//

const govukPrototypeKit = require('govuk-prototype-kit')
const router = govukPrototypeKit.requests.setupRouter()
const catchRecordsSessionMaxAge = 8 * 60 * 60 * 1000
const catchRecordsRoleNavigation = [
  { key: 'users', label: 'Users', href: 'landing-page' },
  { key: 'vessels', label: 'Vessels', href: 'vessels' },
  { key: 'fishing-trips', label: 'Fishing trips', href: 'fishing-trips' },
  { key: 'trip-breakdown', label: 'Trip breakdown', href: 'trip-breakdown' },
  { key: 'audit-log', label: 'Audit log', href: 'audit-log' },
  { key: 'banner-message', label: 'Banner message', href: 'banner-message' }
]
const catchRecordsRoles = {
  serviceManager: {
    key: 'serviceManager', name: 'Service Manager',
    navigation: ['users', 'vessels', 'fishing-trips', 'trip-breakdown', 'audit-log', 'banner-message'],
    permissions: { createUsers: true, editUsers: true, deactivateUsers: true, reactivateUsers: true, manageVessels: 'full', createCatchRecords: true, amendCatchRecords: true, downloadTripPdf: true, exportTripData: true, limitedUserDetails: false }
  },
  fishingVesselLicensing: {
    key: 'fishingVesselLicensing', name: 'Fishing Vessel Licensing',
    navigation: ['users', 'vessels', 'fishing-trips'],
    permissions: { createUsers: true, editUsers: true, deactivateUsers: true, reactivateUsers: true, manageVessels: 'full', createCatchRecords: false, amendCatchRecords: false, downloadTripPdf: false, exportTripData: false, limitedUserDetails: false }
  },
  helpline: {
    key: 'helpline', name: 'Helpline Team',
    navigation: ['users', 'vessels', 'fishing-trips', 'trip-breakdown'],
    permissions: { createUsers: false, editUsers: false, deactivateUsers: false, manageVessels: 'none', createCatchRecords: true, amendCatchRecords: true, downloadTripPdf: false, exportTripData: false, limitedUserDetails: false }
  },
  compliance: {
    key: 'compliance', name: 'Compliance / Investigations',
    navigation: ['users', 'vessels', 'fishing-trips', 'trip-breakdown'],
    readOnly: true,
    permissions: { createUsers: false, editUsers: false, deactivateUsers: false, manageVessels: 'none', createCatchRecords: false, amendCatchRecords: false, downloadTripPdf: true, exportTripData: true, limitedUserDetails: false }
  },
  otherOperations: {
    key: 'otherOperations', name: 'Other Operations Team',
    navigation: ['users', 'vessels', 'fishing-trips', 'trip-breakdown'],
    readOnly: true,
    permissions: { createUsers: false, editUsers: false, deactivateUsers: false, manageVessels: 'none', createCatchRecords: false, amendCatchRecords: false, downloadTripPdf: true, exportTripData: true, limitedUserDetails: true }
  },
  fdst: {
    key: 'fdst', name: 'FDST',
    navigation: ['users', 'vessels', 'fishing-trips', 'trip-breakdown'],
    permissions: { createUsers: true, editUsers: 'limited', deactivateUsers: 'limited', manageVessels: 'skipper', createCatchRecords: false, amendCatchRecords: false, downloadTripPdf: true, exportTripData: true, limitedUserDetails: false }
  },
  fullOps: {
    key: 'fullOps', name: 'Full Ops',
    navigation: ['users', 'vessels', 'fishing-trips', 'trip-breakdown'],
    permissions: { createUsers: true, editUsers: true, deactivateUsers: true, reactivateUsers: true, manageVessels: 'full', createCatchRecords: true, amendCatchRecords: true, downloadTripPdf: true, exportTripData: true, limitedUserDetails: false }
  },
  complianceWithLicensing: {
    key: 'complianceWithLicensing', name: 'Compliance with Licensing',
    navigation: ['users', 'vessels', 'fishing-trips', 'trip-breakdown'],
    permissions: { createUsers: true, editUsers: true, deactivateUsers: true, reactivateUsers: true, manageVessels: 'full', createCatchRecords: false, amendCatchRecords: false, downloadTripPdf: true, exportTripData: true, limitedUserDetails: false }
  }
}

function getCatchRecordsRole (req) {
  const host = req.headers.host || 'default'
  const roleByHost = req.session.data.catchRecordsRoleByHost
  const roleKey = roleByHost ? roleByHost[host] : req.session.data.catchRecordsRole
  return catchRecordsRoles[roleKey] || catchRecordsRoles.serviceManager
}

router.use('/catch-records', function (req, res, next) {
  if (req.session && req.session.cookie) req.session.cookie.maxAge = catchRecordsSessionMaxAge
  if (!req.session || !req.session.data || !req.session.data.catchRecordsSignedIn) return next()

  const requestPath = req.originalUrl.split('?')[0]
  if (requestPath === '/catch-records/role-preview') return next()
  if (!req.session.data.catchRecordsAuthenticatedAt) req.session.data.catchRecordsAuthenticatedAt = Date.now()
  if (Date.now() - req.session.data.catchRecordsAuthenticatedAt >= catchRecordsSessionMaxAge) {
    delete req.session.data.catchRecordsSignedIn
    delete req.session.data.catchRecordsUserEmail
    delete req.session.data.catchRecordsRole
    delete req.session.data.catchRecordsRoleByHost
    if (requestPath !== '/catch-records/sign-in') return res.redirect('/catch-records/sign-in')
  }
  next()
})

const catchRecordsAuditEvents = require('./data/catch-records-audit-events')
const catchRecordsAuditEventsChronological = catchRecordsAuditEvents.slice().sort((first, second) => {
  const firstTime = `${first.date}T${first.dateTime.match(/\d{2}:\d{2}$/)[0]}`
  const secondTime = `${second.date}T${second.dateTime.match(/\d{2}:\d{2}$/)[0]}`
  return firstTime.localeCompare(secondTime)
})
const catchRecordsAuditEventsNewestFirst = catchRecordsAuditEventsChronological.slice().reverse()

const catchRecordsUserDirectory = [
  { userId: '1234', name: 'John Smith', email: 'John.Smith@email.com', telephone: '1234567890', administration: 'England', status: 'accepted' },
  { userId: '1235', name: 'Joe Bloggs', email: 'Joe.Bloggs@email.com', telephone: '7123456321', addressLine1: '3 Example Road', city: 'Milford Haven', postcode: 'SA73 0XX', administration: 'Wales', status: 'accepted' },
  { userId: '1236', name: 'Paul Smith', email: 'Paul.Smith@email.com', telephone: '7341059275', administration: 'Isle of Man', status: 'invited' },
  { userId: '1237', name: 'Frank Castle', email: 'Frank.Castle@email.com', telephone: '1563098743', administration: 'England', status: 'accepted' },
  { userId: '1238', name: 'Peter Petrelli', email: 'Peter.Petrelli@email.com', telephone: '7564152086', administration: 'England', status: 'accepted' },
  { userId: '1239', name: 'Alice Wilson', email: 'Alice.Wilson@email.com', telephone: '7700900101', administration: 'England', status: 'accepted' },
  { userId: '1431', name: 'Ethan Adams', email: 'Ethan.Adams@email.com', telephone: '7700900110', administration: 'Wales', status: 'invited' }
]

const catchRecordsVessels = {
  'Lady Jane': { name: 'Lady Jane', reference: 'PZ1', rss: 'X10001' },
  Quatro: { name: 'Quatro', reference: 'WY43', rss: 'Q12345' },
  'Sea Otter': { name: 'Sea Otter', reference: 'RX09', rss: 'X10010' },
  'Northern Star': { name: 'Northern Star', reference: 'PZ45', rss: 'X10002' },
  Bubbles: { name: 'Bubbles', reference: 'PZ99', rss: 'X10021' }
}

const defaultCatchRecordsVesselUsers = {
  PZ1: [{ userId: '1234', name: 'John Smith', role: 'Owner (Nominee)', linkedOn: '1 June 2026' }],
  WY43: [{ userId: '1238', name: 'Peter Petrelli', role: 'Owner (Nominee)', linkedOn: '10 June 2026' }],
  RX09: [{ userId: '1237', name: 'Frank Castle', role: 'Owner (Nominee)', linkedOn: '10 June 2026' }],
  PZ45: [{ userId: '1239', name: 'Alice Wilson', role: 'Owner (Nominee)', linkedOn: '6 June 2026' }]
}

function getCatchRecordsUsers (req) {
  const deactivatedUserIds = new Set(req.session.data.catchRecordsDeactivatedUserIds || [])
  return catchRecordsUserDirectory.concat(req.session.data.catchRecordsNewUsers || []).map(user => (
    { ...user, ...(req.session.data.catchRecordsUserEdits || {})[user.userId], ...(deactivatedUserIds.has(user.userId) ? { status: 'deactivated' } : {}) }
  ))
}

function getCatchRecordsVessel (value) {
  return Object.values(catchRecordsVessels).find(vessel => vessel.name === value || vessel.reference === value)
}

function getCatchRecordsVesselUsers (req, vesselReference) {
  const savedUsers = req.session.data.catchRecordsVesselUsers || {}
  const savedLinks = savedUsers[vesselReference]
  const users = Array.isArray(savedLinks) ? savedLinks : defaultCatchRecordsVesselUsers[vesselReference] || []
  const createdUserIds = new Set((req.session.data.catchRecordsNewUsers || []).map(user => user.userId))
  return users.map(user => ({ ...user, name: ((req.session.data.catchRecordsUserEdits || {})[user.userId] || {}).name || user.name, reference: vesselReference, isNewUser: createdUserIds.has(user.userId) }))
}

function canCatchRecordsRoleDeactivateUser (req, role, userId) {
  if (role.permissions.deactivateUsers === true) return true
  if (role.permissions.deactivateUsers !== 'limited' || !userId) return false

  const vesselLinks = Object.values(catchRecordsVessels).flatMap(vessel =>
    getCatchRecordsVesselUsers(req, vessel.reference).filter(user => user.userId === userId))
  return vesselLinks.length === 0 || vesselLinks.every(user => user.role === 'Skipper (Master)')
}

function renderVesselUsersPage (res, values) {
  return res.render('catch-records/vessel-users', values)
}

function getTodayDisplay () {
  return new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

function getTodayDate () {
  return new Date().toISOString().slice(0, 10)
}

function getNowDisplay () {
  const now = new Date()
  return `${now.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}, ${now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`
}

const catchRecordsTrips = {
  A12345202606151302: {
    id: 'A12345202606151302',
    userName: 'John Smith',
    userId: '1234',
    vesselName: 'Lady Jane',
    pln: 'PZ1',
    tripDate: '14 June 2026',
    createdOn: '15 June 2026, 13:02',
    receivedOn: '14 June 2026, 09:05',
    gears: [
      { id: 'gear-1', type: 'Beam trawl', measurements: ['80 mm mesh', '2 beams'], subrectangle: '36E5' },
      { id: 'gear-2', type: 'Bottom otter trawl', measurements: ['80 mm mesh', '2 trawl nets'], subrectangle: '37F1' },
      { id: 'gear-3', type: 'Trammel net', measurements: ['80 mm mesh', '25 m of net left in the water at the end of the trip'], subrectangle: '37F1' }
    ],
    retainedCatch: 'No',
    departurePort: 'Newlyn',
    portCode: 'GBNLY',
    submissionMethod: 'Automated service',
    notes: [
      { id: 1, author: 'Lucy Harper', authorRole: 'Helpline Team', dateTime: '15 June 2026, 13:10', text: 'Queried amendment reason with John Smith by phone; confirmed correction was needed.' }
    ],
    catches: [
      { species: 'Common sole', code: 'SOL', gearId: 'gear-1', weight: '6.70', retained: '' },
      { species: 'John Dory', code: 'JOD', gearId: 'gear-1', weight: '18.00', retained: '' },
      { species: 'Lemon sole', code: 'LEM', gearId: 'gear-2', weight: '22.00', originalWeight: '12.00', retained: '' },
      { species: 'European plaice', code: 'PLE', gearId: 'gear-2', weight: '19.00', retained: '' },
      { species: 'Megrim', code: 'MEG', gearId: 'gear-3', weight: '9.50', retained: '' }
    ],
    originalVersion: { key: 'original', label: 'Original record', dateTime: '15 June 2026, 13:02', by: 'John Smith', status: 'Submitted', retainedCatch: 'No' },
    amendments: [
      { key: 'current-amended', label: 'Amendment 1 (current)', dateTime: '15 June 2026, 14:20', by: 'Lucy Harper', reason: 'Corrected catch weight for lemon sole', status: 'Amended', retainedCatch: 'No' }
    ]
  },
  A45352202606151201: {
    id: 'A45352202606151201',
    userName: 'Peter Petrelli',
    userId: '1238',
    vesselName: 'Quatro',
    pln: 'WY43',
    tripDate: '15 June 2026',
    createdOn: '15 June 2026, 12:01',
    receivedOn: '15 June 2026, 12:01',
    gears: [{ id: 'gear-1', type: 'Bottom otter trawl', measurements: ['80 mm mesh', '2 trawl nets'], subrectangle: '36E5' }],
    retainedCatch: 'Yes',
    departurePort: 'Milford Haven',
    portCode: 'GBMLF',
    submissionMethod: 'App',
    isPrototypeSample: true,
    notes: [
      { id: 1, author: 'Lucy Harper', authorRole: 'Helpline Team', dateTime: '15 June 2026, 13:35', text: 'Spoke with Peter Petrelli by phone. He confirmed the original weight for spinous spider crab should be 15 kg.' },
      { id: 2, author: 'Lucy Harper', authorRole: 'Helpline Team', dateTime: '15 June 2026, 14:10', text: 'Peter called back to correct the weight to 16 kg. Updated the record following his confirmation.' },
      { id: 3, author: 'Lucy Harper', authorRole: 'Helpline Team', dateTime: '16 June 2026, 09:05', text: 'Peter confirmed that 3 kg was retained. Added the retained weight to the trip record.' }
    ],
    catches: [
      { species: 'Spinous spider crab', code: 'SCR', gearId: 'gear-1', originalWeight: '14.00', amendment1Weight: '15.00', weight: '16.00', originalRetained: '', retained: '3.00' }
    ],
    originalVersion: { key: 'original', label: 'Original record', dateTime: '15 June 2026, 12:01', by: 'Peter Petrelli', status: 'Submitted', amendmentNumber: 0, retainedCatch: 'No' },
    amendments: [
      { key: 'current-amended', label: 'Amendment 3 (current)', dateTime: '16 June 2026, 09:15', by: 'Lucy Harper', reason: 'Added 3 kg retained weight omitted from the original submission.', status: 'Amended', amendmentNumber: 3, retainedCatch: 'Yes' },
      { key: 'amendment-2', label: 'Amendment 2', dateTime: '15 June 2026, 14:20', by: 'Lucy Harper', reason: 'Updated the weight to 16 kg following a call with Peter.', status: 'Amended', amendmentNumber: 2, retainedCatch: 'No' },
      { key: 'amendment-1', label: 'Amendment 1', dateTime: '15 June 2026, 13:45', by: 'Lucy Harper', reason: 'Corrected the reported weight to 15 kg.', status: 'Amended', amendmentNumber: 1, retainedCatch: 'No' }
    ]
  },
  C34245202608171402: {
    id: 'C34245202608171402',
    userName: 'Frank Castle',
    userId: '1237',
    vesselName: 'Sea Otter',
    pln: 'RX09',
    tripDate: '17 August 2026',
    createdOn: '17 August 2026, 14:02',
    receivedOn: '17 August 2026, 14:16',
    gears: [
      { id: 'gear-1', type: 'Pots', measurements: ['60 pots deployed', '8 pots left in the water at the end of the trip'], subrectangle: '30E8' },
      { id: 'gear-2', type: 'Trammel net', measurements: ['80 mm mesh', '240 m of net deployed', '20 m of net left in the water at the end of the trip'], subrectangle: '30E9' },
      { id: 'gear-3', type: 'Dredge', measurements: ['2 dredges', 'Used three times on this trip'], subrectangle: '30E8' }
    ],
    retainedCatch: 'Yes',
    departurePort: 'Hastings',
    returnPort: 'Hastings',
    portCode: 'GBHTG',
    submissionMethod: 'App',
    isPrototypeSample: true,
    notes: [
      { id: 1, author: 'Lucy Harper', authorRole: 'Fishing Vessel Licensing', dateTime: '17 August 2026, 14:12', text: 'Frank confirmed Sea Otter departed from and returned to Hastings for this trip.' },
      { id: 2, author: 'Lucy Harper', authorRole: 'Compliance / Investigations', dateTime: '17 August 2026, 14:20', text: 'Confirmed retained, below-minimum-size and discarded weights were recorded for each catch.' }
    ],
    catches: [
      { species: 'Edible crab', code: 'CRE', gearId: 'gear-1', weight: '18', retained: '14', weightBelowMinimumSize: '1', weightDiscarded: '4' },
      { species: 'Whelk', code: 'WHE', gearId: 'gear-1', weight: '26', retained: '22', weightBelowMinimumSize: '1', weightDiscarded: '4' },
      { species: 'Common sole', code: 'SOL', gearId: 'gear-2', weight: '8', retained: '6', weightBelowMinimumSize: '1', weightDiscarded: '2' },
      { species: 'King scallop', code: 'SCE', gearId: 'gear-3', weight: '24.00', retained: '18.00', weightBelowMinimumSize: '2.00', weightDiscarded: '6.00' },
      { species: 'Queen scallop', code: 'QSC', gearId: 'gear-3', weight: '12.00', retained: '9.00', weightBelowMinimumSize: '1.00', weightDiscarded: '3.00' }
    ],
    originalVersion: { key: 'original', label: 'Original record', dateTime: '17 August 2026, 14:02', by: 'Frank Castle', status: 'Submitted', retainedCatch: 'Yes' },
    amendments: []
  },
  D12345202608181401: {
    id: 'D12345202608181401',
    userName: 'Alice Wilson',
    userId: '1239',
    vesselName: 'Northern Star',
    pln: 'PZ45',
    tripDate: '18 August 2026',
    createdOn: '18 August 2026, 14:01',
    receivedOn: '18 August 2026, 14:08',
    gears: [{ id: 'gear-1', type: 'Dredge', measurements: ['2 dredges', 'Used three times on this trip'], subrectangle: '30E8' }],
    retainedCatch: 'Yes',
    departurePort: 'Newlyn',
    returnPort: 'Newlyn',
    portCode: 'GBNLY',
    submissionMethod: 'App',
    isPrototypeSample: true,
    notes: [],
    catches: [
      { species: 'King scallop', code: 'SCE', gearId: 'gear-1', weight: '24.00', retained: '18.00', weightBelowMinimumSize: '2.00', weightDiscarded: '6.00' },
      { species: 'Queen scallop', code: 'QSC', gearId: 'gear-1', weight: '12.00', retained: '9.00', weightBelowMinimumSize: '1.00', weightDiscarded: '3.00' }
    ],
    originalVersion: { key: 'original', label: 'Original record', dateTime: '18 August 2026, 14:01', by: 'Alice Wilson', status: 'Submitted', retainedCatch: 'Yes' },
    amendments: []
  },
  E45352202608201402: {
    id: 'E45352202608201402',
    userName: 'Alice Wilson',
    userId: '1239',
    vesselName: 'Northern Star',
    pln: 'PZ45',
    tripDate: '20 August 2026',
    createdOn: '20 August 2026, 14:02',
    receivedOn: '20 August 2026, 14:12',
    gears: [{ id: 'gear-1', type: 'Seine nets (not specified)', measurements: ['100 mm mesh', 'Used twice on this trip', '75 m of net left in the water at the end of the trip'], subrectangle: '36E5' }],
    retainedCatch: 'Yes',
    departurePort: 'Newlyn',
    returnPort: 'Newlyn',
    portCode: 'GBNLY',
    submissionMethod: 'App',
    isPrototypeSample: true,
    notes: [],
    catches: [
      { species: 'Herring', code: 'HER', gearId: 'gear-1', weight: '40.00', retained: '32.00', weightBelowMinimumSize: '2.00', weightDiscarded: '8.00' },
      { species: 'Mackerel', code: 'MAC', gearId: 'gear-1', weight: '25.00', retained: '20.00', weightDiscarded: '5.00' }
    ],
    originalVersion: { key: 'original', label: 'Original record', dateTime: '20 August 2026, 14:02', by: 'Alice Wilson', status: 'Submitted', retainedCatch: 'Yes' },
    amendments: []
  },
  F34245202608221410: {
    id: 'F34245202608221410',
    userName: 'Alice Wilson',
    userId: '1239',
    vesselName: 'Northern Star',
    pln: 'PZ45',
    tripDate: '22 August 2026',
    createdOn: '22 August 2026, 14:10',
    receivedOn: '22 August 2026, 14:21',
    gears: [{ id: 'gear-1', type: 'Gillnets (drift)', measurements: ['100 mm mesh', '120 m of net hauled', '24 m of net left in the water at the end of the trip'], subrectangle: '30E8' }],
    retainedCatch: 'Yes',
    departurePort: 'Newlyn',
    returnPort: 'Newlyn',
    portCode: 'GBNLY',
    submissionMethod: 'App',
    isPrototypeSample: true,
    notes: [],
    catches: [
      { species: 'Herring', code: 'HER', gearId: 'gear-1', weight: '35.00', retained: '30.00', weightBelowMinimumSize: '1.00', weightDiscarded: '5.00' },
      { species: 'Cod', code: 'COD', gearId: 'gear-1', weight: '18.00', retained: '15.00', weightDiscarded: '3.00' }
    ],
    originalVersion: { key: 'original', label: 'Original record', dateTime: '22 August 2026, 14:10', by: 'Alice Wilson', status: 'Submitted', retainedCatch: 'Yes' },
    amendments: []
  },
  G12345202608241410: {
    id: 'G12345202608241410',
    userName: 'Alice Wilson',
    userId: '1239',
    vesselName: 'Northern Star',
    pln: 'PZ45',
    tripDate: '24 August 2026',
    createdOn: '24 August 2026, 14:10',
    receivedOn: '24 August 2026, 14:18',
    gears: [{ id: 'gear-1', type: 'Handlines and pole lines (hand operated)', measurements: ['4 rods and lines used during the trip', '12 hooks left in the water at the end of the trip'], subrectangle: '30E8' }],
    retainedCatch: 'Yes',
    departurePort: 'Newlyn',
    returnPort: 'Newlyn',
    portCode: 'GBNLY',
    submissionMethod: 'App',
    isPrototypeSample: true,
    notes: [],
    catches: [
      { species: 'Pollack', code: 'POL', gearId: 'gear-1', weight: '12.00', retained: '10.00', weightDiscarded: '2.00' },
      { species: 'European seabass', code: 'BSS', gearId: 'gear-1', weight: '8.00', retained: '7.00', weightDiscarded: '1.00' }
    ],
    originalVersion: { key: 'original', label: 'Original record', dateTime: '24 August 2026, 14:10', by: 'Alice Wilson', status: 'Submitted', retainedCatch: 'Yes' },
    amendments: []
  },
  H12345202608261410: {
    id: 'H12345202608261410',
    userName: 'Alice Wilson',
    userId: '1239',
    vesselName: 'Northern Star',
    pln: 'PZ45',
    tripDate: '26 August 2026',
    createdOn: '26 August 2026, 14:10',
    receivedOn: '26 August 2026, 14:18',
    gears: [{ id: 'gear-1', type: 'Handlines and pole lines (mechanised)', measurements: ['2 rods and lines used during the trip', '8 hooks left in the water at the end of the trip'], subrectangle: '30E9' }],
    retainedCatch: 'Yes',
    departurePort: 'Newlyn',
    returnPort: 'Newlyn',
    portCode: 'GBNLY',
    submissionMethod: 'App',
    isPrototypeSample: true,
    notes: [],
    catches: [
      { species: 'Herring', code: 'HER', gearId: 'gear-1', weight: '30.00', retained: '25.00', weightBelowMinimumSize: '1.00', weightDiscarded: '5.00' },
      { species: 'Mackerel', code: 'MAC', gearId: 'gear-1', weight: '20.00', retained: '17.00', weightDiscarded: '3.00' }
    ],
    originalVersion: { key: 'original', label: 'Original record', dateTime: '26 August 2026, 14:10', by: 'Alice Wilson', status: 'Submitted', retainedCatch: 'Yes' },
    amendments: []
  },
  I12345202608281410: {
    id: 'I12345202608281410',
    userName: 'Alice Wilson',
    userId: '1239',
    vesselName: 'Northern Star',
    pln: 'PZ45',
    tripDate: '28 August 2026',
    createdOn: '28 August 2026, 14:10',
    receivedOn: '28 August 2026, 14:18',
    gears: [{ id: 'gear-1', type: 'Hooks and lines (not specified)', measurements: ['120 hooks hauled during the trip', '20 hooks left in the water at the end of the trip'], subrectangle: '36E5' }],
    retainedCatch: 'Yes',
    departurePort: 'Newlyn',
    returnPort: 'Newlyn',
    portCode: 'GBNLY',
    submissionMethod: 'App',
    isPrototypeSample: true,
    notes: [],
    catches: [
      { species: 'Cod', code: 'COD', gearId: 'gear-1', weight: '25.00', retained: '22.00', weightBelowMinimumSize: '1.00', weightDiscarded: '3.00' },
      { species: 'Haddock', code: 'HAD', gearId: 'gear-1', weight: '15.00', retained: '14.00', weightDiscarded: '1.00' }
    ],
    originalVersion: { key: 'original', label: 'Original record', dateTime: '28 August 2026, 14:10', by: 'Alice Wilson', status: 'Submitted', retainedCatch: 'Yes' },
    amendments: []
  },
  J12345202608301410: {
    id: 'J12345202608301410',
    userName: 'Alice Wilson',
    userId: '1239',
    vesselName: 'Northern Star',
    pln: 'PZ45',
    tripDate: '30 August 2026',
    createdOn: '30 August 2026, 14:10',
    receivedOn: '30 August 2026, 14:18',
    gears: [{ id: 'gear-1', type: 'Longlines not specified', measurements: ['250 hooks and lines used during the trip', '40 hooks left in the water at the end of the trip'], subrectangle: '36E6' }],
    retainedCatch: 'Yes',
    departurePort: 'Newlyn',
    returnPort: 'Newlyn',
    portCode: 'GBNLY',
    submissionMethod: 'App',
    isPrototypeSample: true,
    notes: [],
    catches: [
      { species: 'Cod', code: 'COD', gearId: 'gear-1', weight: '36.00', retained: '30.00', weightBelowMinimumSize: '2.00', weightDiscarded: '6.00' },
      { species: 'Ling', code: 'LIN', gearId: 'gear-1', weight: '18.00', retained: '16.00', weightDiscarded: '2.00' }
    ],
    originalVersion: { key: 'original', label: 'Original record', dateTime: '30 August 2026, 14:10', by: 'Alice Wilson', status: 'Submitted', retainedCatch: 'Yes' },
    amendments: []
  }
}

function getCatchRecordsTrip (tripId) {
  const tripRecord = catchRecordsTrips[tripId] || catchRecordsTrips.A12345202606151302
  const gearsById = Object.fromEntries(tripRecord.gears.map(gear => [gear.id, gear]))
  const catches = tripRecord.catches.map(catchRecord => ({
    ...catchRecord,
    gearType: gearsById[catchRecord.gearId] ? gearsById[catchRecord.gearId].type : 'Not recorded',
    gearMeasurements: gearsById[catchRecord.gearId] ? gearsById[catchRecord.gearId].measurements : []
  }))
  const history = catchRecordsAuditEventsChronological
    .filter(event => event.tripId === tripRecord.id)
    .map(event => ({
      dateTime: event.dateTime,
      timestamp: `${event.date}T${event.dateTime.match(/\d{2}:\d{2}$/)[0]}:00`,
      action: event.change,
      by: event.performedBy
    }))

  return { ...tripRecord, catches, history: history.reverse(), notes: tripRecord.notes.slice().reverse() }
}

function getCatchRecordsV2Trip (tripId) {
  const tripRecord = getCatchRecordsTrip(tripId)
  const simplifyMeasurement = measurement => measurement
    .replace(/ at the end of the trip$/, '')
    .replace(/ during the trip$/, '')
    .replace(/^Used three times on this trip$/, 'shot 3 times')
    .replace(/^Used twice on this trip$/, 'shot 2 times')

  return {
    ...tripRecord,
    gears: tripRecord.gears.map(gear => ({ ...gear, measurements: gear.measurements.map(simplifyMeasurement) })),
    catches: tripRecord.catches.map(catchRecord => ({
      ...catchRecord,
      gearMeasurements: catchRecord.gearMeasurements.map(simplifyMeasurement)
    }))
  }
}

const catchRecordsTripBreakdownExportByRow = Object.values(catchRecordsTrips).reduce((rowsByKey, trip) => {
  const gearsById = Object.fromEntries(trip.gears.map(gear => [gear.id, gear]))
  const notes = trip.notes.map(note => `${note.dateTime} (${note.author}): ${note.text}`).join(' | ')
  trip.catches.forEach(catchRecord => {
    const gear = gearsById[catchRecord.gearId]
    if (!gear) return
    const key = [trip.id, catchRecord.species, catchRecord.code, gear.type].join('|')
    rowsByKey[key] = {
      userId: trip.userId,
      createdBy: trip.userName,
      createdOn: trip.createdOn,
      receivedOn: trip.receivedOn,
      submissionMethod: trip.submissionMethod,
      retainedCatch: trip.retainedCatch,
      tripStatus: trip.amendments.length ? 'Amended' : trip.originalVersion.status,
      amendmentReason: trip.amendments[0] ? trip.amendments[0].reason : '',
      gearMeasurements: gear.measurements.join('; '),
      gearSubrectangle: gear.subrectangle,
      weightBelowMinimumSize: catchRecord.weightBelowMinimumSize || '',
      weightDiscarded: catchRecord.weightDiscarded || '',
      notes
    }
  })
  return rowsByKey
}, {})

router.get('/catch-records/sign-in', function (req, res) {
  if (req.session.data.catchRecordsSignedIn) return res.redirect('/catch-records/landing-page')

  const errors = req.session.data.catchRecordsSignInErrors || []
  delete req.session.data.catchRecordsSignInErrors
  res.render('catch-records/sign-in', {
    errors,
    email: req.session.data.catchRecordsSignInEmail || ''
  })
})

router.post('/catch-records/sign-in', function (req, res) {
  const email = (req.body['catch-records-sign-in-email'] || '').trim()
  const password = req.body['catch-records-sign-in-password'] || ''
  delete req.session.data['catch-records-sign-in-password']

  const errors = []
  if (!email) {
    errors.push({ field: 'email', text: 'Enter your email address' })
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push({ field: 'email', text: 'Enter an email address in the correct format' })
  }
  if (!password) errors.push({ field: 'password', text: 'Enter your password' })

  if (errors.length) {
    req.session.data.catchRecordsSignInErrors = errors
    req.session.data.catchRecordsSignInEmail = email
    return res.redirect('/catch-records/sign-in')
  }

  delete req.session.data.catchRecordsSignInEmail
  req.session.data.catchRecordsSignedIn = true
  req.session.data.catchRecordsUserEmail = email
  delete req.session.data.catchRecordsRoleByHost
  delete req.session.data.catchRecordsRole
  req.session.data.catchRecordsAuthenticatedAt = Date.now()
  res.redirect('/catch-records/index')
})

router.post('/catch-records/sign-out', function (req, res) {
  delete req.session.data.catchRecordsSignedIn
  delete req.session.data.catchRecordsUserEmail
  delete req.session.data.catchRecordsRole
  delete req.session.data.catchRecordsRoleByHost
  delete req.session.data.catchRecordsAuthenticatedAt
  res.redirect('/catch-records/sign-in')
})

router.get('/catch-records/role-preview', function (req, res) {
  const role = catchRecordsRoles[req.query.role]
  if (!role) return res.redirect('/catch-records/index')

  req.session.data.catchRecordsSignedIn = true
  req.session.data.catchRecordsUserEmail = 'preview@example.test'
  const host = req.headers.host || 'default'
  req.session.data.catchRecordsRoleByHost = { ...(req.session.data.catchRecordsRoleByHost || {}), [host]: role.key }
  req.session.data.catchRecordsAuthenticatedAt = Date.now()
  res.redirect('/catch-records/landing-page')
})

router.use('/catch-records', function (req, res, next) {
  if (req.session.data.catchRecordsSignedIn) {
    const role = getCatchRecordsRole(req)
    const navigationByPath = {
      '/catch-records/landing-page': 'users',
      '/catch-records/create-user': 'users',
      '/catch-records/edit-user': 'users',
      '/catch-records/user-vessels': 'users',
      '/catch-records/deactivate-user': 'users',
      '/catch-records/reactivate-user': 'users',
      '/catch-records/new-user-profile': 'users',
      '/catch-records/user-note': 'users',
      '/catch-records/user-profile': 'users',
      '/catch-records/vessels': 'vessels',
      '/catch-records/vessel-profile': 'vessels',
      '/catch-records/vessel-users': 'vessels',
      '/catch-records/fishing-trips': 'fishing-trips',
      '/catch-records/trip-profile': 'fishing-trips',
      '/catch-records/trip-amendments': 'fishing-trips',
      '/catch-records/trip-breakdown': 'trip-breakdown',
      '/catch-records/trip-layout-archive': 'fishing-trips',
      '/catch-records/audit-log': 'audit-log',
      '/catch-records/banner-message': 'banner-message'
    }
    const requestPath = req.originalUrl.split('?')[0]
    const requiredNavigation = navigationByPath[requestPath]
    if (requiredNavigation && !role.navigation.includes(requiredNavigation)) return res.redirect('/catch-records/landing-page?access=denied')
    if (requestPath === '/catch-records/create-user' && !role.permissions.createUsers) return res.redirect('/catch-records/landing-page?access=denied')
    if (requestPath === '/catch-records/edit-user' && !role.permissions.editUsers) return res.redirect('/catch-records/landing-page?access=denied')
    if (requestPath === '/catch-records/user-note' && role.readOnly) return res.redirect('/catch-records/landing-page?access=denied')
    if (requestPath === '/catch-records/user-vessels' && role.permissions.manageVessels === 'none') return res.redirect('/catch-records/landing-page?access=denied')
    if (requestPath === '/catch-records/deactivate-user') {
      const users = getCatchRecordsUsers(req)
      const requestedUser = req.method === 'POST'
        ? users.find(user => user.userId === (req.body || {})['user-id'])
        : users.find(user => user.userId === req.query.userId || user.name === req.query.user)
      if (!requestedUser || !canCatchRecordsRoleDeactivateUser(req, role, requestedUser.userId)) return res.redirect('/catch-records/landing-page?access=denied')
    }
    if (requestPath === '/catch-records/reactivate-user' && role.permissions.reactivateUsers !== true) return res.redirect('/catch-records/landing-page?access=denied')
    if (requestPath === '/catch-records/vessel-users' && role.permissions.manageVessels === 'none') return res.redirect('/catch-records/landing-page?access=denied')

    const sessionEvents = req.session.data.catchRecordsAuditEvents || []
    const combinedEvents = catchRecordsAuditEventsChronological.concat(sessionEvents).sort((first, second) => {
      const firstTime = `${first.date}T${first.dateTime.match(/\d{2}:\d{2}$/)[0]}`
      const secondTime = `${second.date}T${second.dateTime.match(/\d{2}:\d{2}$/)[0]}`
      return firstTime.localeCompare(secondTime)
    })
    const currentUsers = getCatchRecordsUsers(req)
    const vesselUsersByReference = {}

    Object.values(catchRecordsVessels).forEach(vessel => {
      vesselUsersByReference[vessel.reference] = getCatchRecordsVesselUsers(req, vessel.reference)
    })

    const currentUser = currentUsers.find(user => user.name === req.query.user || user.userId === req.query.userId)
    res.locals.catchRecordsProfileUser = currentUser
    res.locals.catchRecordsUsersByOriginalName = Object.fromEntries(catchRecordsUserDirectory.map(user => [user.name, currentUsers.find(current => current.userId === user.userId)]))
    const currentVessel = getCatchRecordsVessel(req.query.vessel)
    res.locals.catchRecordsAuditEvents = combinedEvents.slice().reverse()
    res.locals.catchRecordsTripBreakdownExportByRow = catchRecordsTripBreakdownExportByRow
    res.locals.catchRecordsRole = role
    res.locals.catchRecordsRoleNavigation = catchRecordsRoleNavigation.filter(item => role.navigation.includes(item.key))
    res.locals.catchRecordsUserStatusByName = Object.fromEntries(currentUsers.map(user => [user.name, user.status]))
    res.locals.catchRecordsCanDeactivateUser = currentUser ? canCatchRecordsRoleDeactivateUser(req, role, currentUser.userId) : false
    res.locals.catchRecordsAuditEventsChronological = combinedEvents
    res.locals.catchRecordsNewUsers = currentUsers.filter(user => (req.session.data.catchRecordsNewUsers || []).some(created => created.userId === user.userId))
    res.locals.catchRecordsVesselUsers = getCatchRecordsVesselUsers(req, currentVessel ? currentVessel.reference : req.query.vessel === 'Quatro' ? 'WY43' : 'PZ1')
    res.locals.catchRecordsVesselUsersByReference = vesselUsersByReference
    res.locals.catchRecordsUsersUpdated = req.query.usersUpdated || ''
    res.locals.catchRecordsUserVesselLinks = currentUser
      ? Object.entries(vesselUsersByReference).flatMap(([reference, users]) => users
        .filter(user => user.userId === currentUser.userId)
        .map(user => ({ ...user, reference, vesselName: Object.values(catchRecordsVessels).find(vessel => vessel.reference === reference).name })))
      : []
    res.locals.catchRecordsCurrentVessel = currentVessel
    return next()
  }
  res.redirect('/catch-records/sign-in')
})

router.get('/catch-records/deactivate-user', function (req, res) {
  const user = getCatchRecordsUsers(req).find(option => option.userId === req.query.userId || option.name === req.query.user)
  const role = getCatchRecordsRole(req)
  if (!user || !canCatchRecordsRoleDeactivateUser(req, role, user.userId)) return res.redirect('/catch-records/landing-page')

  const isNewUser = (req.session.data.catchRecordsNewUsers || []).some(option => option.userId === user.userId)
  const profileUrl = isNewUser
    ? `new-user-profile?userId=${user.userId}`
    : `user-profile?user=${user.name.replace(/ /g, '+')}&status=${user.status}`
  if (user.status === 'deactivated') return res.redirect(profileUrl)

  res.render('catch-records/deactivate-user', { profileUser: user, profileUrl })
})

router.post('/catch-records/deactivate-user', function (req, res) {
  const user = getCatchRecordsUsers(req).find(option => option.userId === req.body['user-id'])
  const role = getCatchRecordsRole(req)
  if (!user || !canCatchRecordsRoleDeactivateUser(req, role, user.userId)) return res.redirect('/catch-records/landing-page')

  const isNewUser = (req.session.data.catchRecordsNewUsers || []).some(option => option.userId === user.userId)
  const profileUrl = isNewUser
    ? `new-user-profile?userId=${user.userId}`
    : `user-profile?user=${user.name.replace(/ /g, '+')}&status=deactivated`
  if (user.status !== 'deactivated') {
    req.session.data.catchRecordsDeactivatedUserIds = Array.from(new Set([...(req.session.data.catchRecordsDeactivatedUserIds || []), user.userId]))
    req.session.data.catchRecordsAuditEvents = (req.session.data.catchRecordsAuditEvents || []).concat({
      date: getTodayDate(),
      dateTime: getNowDisplay(),
      recordType: 'user',
      reference: user.name,
      action: 'User deactivated',
      change: 'User deactivated',
      userId: user.userId,
      userName: user.name,
      userRole: '',
      vesselReference: '',
      tripId: '',
      performedBy: 'Sam Smith',
      href: profileUrl
    })
  }
  res.redirect(`${profileUrl}&usersUpdated=deactivated`)
})

router.get('/catch-records/reactivate-user', function (req, res) {
  const user = getCatchRecordsUsers(req).find(option => option.userId === req.query.userId || option.name === req.query.user)
  if (!user || (user.status !== 'deactivated' && req.query.status !== 'deactivated')) return res.redirect('/catch-records/landing-page')
  const profileUser = { ...user, status: 'deactivated' }

  const originalUser = catchRecordsUserDirectory.concat(req.session.data.catchRecordsNewUsers || []).find(option => option.userId === user.userId)
  const isNewUser = (req.session.data.catchRecordsNewUsers || []).some(option => option.userId === user.userId)
  const profileUrl = isNewUser
    ? `new-user-profile?userId=${user.userId}`
    : `user-profile?user=${user.name.replace(/ /g, '+')}&status=${originalUser.status}`
  res.render('catch-records/reactivate-user', { profileUser, profileUrl })
})

router.post('/catch-records/reactivate-user', function (req, res) {
  const user = getCatchRecordsUsers(req).find(option => option.userId === req.body['user-id'])
  if (!user || (user.status !== 'deactivated' && req.body['user-status'] !== 'deactivated')) return res.redirect('/catch-records/landing-page')

  const originalUser = catchRecordsUserDirectory.concat(req.session.data.catchRecordsNewUsers || []).find(option => option.userId === user.userId)
  const isNewUser = (req.session.data.catchRecordsNewUsers || []).some(option => option.userId === user.userId)
  const profileUrl = isNewUser
    ? `new-user-profile?userId=${user.userId}`
    : `user-profile?user=${user.name.replace(/ /g, '+')}&status=${originalUser.status}`
  req.session.data.catchRecordsDeactivatedUserIds = (req.session.data.catchRecordsDeactivatedUserIds || []).filter(userId => userId !== user.userId)
  req.session.data.catchRecordsAuditEvents = (req.session.data.catchRecordsAuditEvents || []).concat({
    date: getTodayDate(),
    dateTime: getNowDisplay(),
    recordType: 'user',
    reference: user.name,
    action: 'User reactivated',
    change: 'User reactivated',
    userId: user.userId,
    userName: user.name,
    userRole: '',
    vesselReference: '',
    tripId: '',
    performedBy: 'Sam Smith',
    href: profileUrl
  })
  res.redirect(`${profileUrl}&usersUpdated=reactivated`)
})

router.get('/catch-records/sortable-table.mjs', function (req, res) {
  res.sendFile(require.resolve('@ministryofjustice/frontend/moj/components/sortable-table/sortable-table.bundle.mjs'))
})

router.get('/catch-records/moj-frontend.css', function (req, res) {
  res.sendFile(require.resolve('@ministryofjustice/frontend/moj/moj-frontend.min.css'))
})

router.get('/catch-records/create-user', function (req, res) {
  const errors = req.session.data.catchRecordsCreateUserErrors || []
  const formValues = req.session.data.catchRecordsCreateUserValues || {}
  delete req.session.data.catchRecordsCreateUserErrors
  delete req.session.data.catchRecordsCreateUserValues
  res.render('catch-records/create-user', { errors, formValues })
})

router.get('/catch-records/edit-user', function (req, res) {
  const user = getCatchRecordsUsers(req).find(option => option.userId === req.query.userId)
  if (!user) return res.redirect('/catch-records/landing-page')
  res.render('catch-records/create-user', { editing: true, profileUser: user, errors: [], formValues: user })
})

router.post(['/catch-records/create-user', '/catch-records/edit-user'], function (req, res, next) {
  const editing = req.path === '/catch-records/edit-user'
  const existingUser = editing ? getCatchRecordsUsers(req).find(user => user.userId === req.body['user-id']) : null
  if (editing && !existingUser) return res.redirect('/catch-records/landing-page')
  const formValues = {
    name: (req.body['full-name'] || '').trim(),
    email: (req.body['email-address'] || '').trim(),
    telephone: (req.body['telephone-number'] || '').trim(),
    addressLine1: (req.body['address-line-1'] || '').trim(),
    addressLine2: (req.body['address-line-2'] || '').trim(),
    city: (req.body['address-town-city'] || '').trim(),
    postcode: (req.body['address-postcode'] || '').trim(),
    administration: (req.body.administration || '').trim()
  }
  const errors = []
  const existingUsers = getCatchRecordsUsers(req)
  const role = getCatchRecordsRole(req)
  if (editing && role.permissions.editUsers === 'limited') formValues.administration = existingUser.administration

  if (!formValues.name) errors.push({ field: 'full-name', text: 'Enter the user’s full name' })
  if (!editing || formValues.addressLine1 || formValues.city || formValues.postcode) {
    if (!formValues.addressLine1) errors.push({ field: 'address-line-1', text: 'Enter the first line of the address' })
    if (!formValues.city) errors.push({ field: 'address-town-city', text: 'Enter a town or city' })
    if (!formValues.postcode) errors.push({ field: 'address-postcode', text: 'Enter a postcode' })
  }
  if (!formValues.email) {
    errors.push({ field: 'email-address', text: 'Enter an email address' })
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formValues.email)) {
    errors.push({ field: 'email-address', text: 'Enter an email address in the correct format' })
  } else if (existingUsers.some(user => user.userId !== (existingUser || {}).userId && user.email.toLowerCase() === formValues.email.toLowerCase())) {
    errors.push({ field: 'email-address', text: 'A user with this email address already exists' })
  }
  const administrations = !editing && ['fdst', 'fishingVesselLicensing'].includes(role.key)
    ? ['England', 'Wales', 'Isle of Man']
    : ['England', 'Wales', 'Scotland', 'Northern Ireland', 'Isle of Man']
  if (!administrations.includes(formValues.administration)) errors.push({ field: 'administration', text: 'Select an administration' })

  if (errors.length) {
    if (editing) return res.render('catch-records/create-user', { editing, profileUser: existingUser, errors, formValues })
    req.session.data.catchRecordsCreateUserErrors = errors
    req.session.data.catchRecordsCreateUserValues = formValues
    return res.redirect('/catch-records/create-user')
  }

  if (editing) {
    req.session.data.catchRecordsUserEdits = { ...(req.session.data.catchRecordsUserEdits || {}), [existingUser.userId]: formValues }
    req.session.data.catchRecordsAuditEvents = (req.session.data.catchRecordsAuditEvents || []).concat({
      date: getTodayDate(), dateTime: getNowDisplay(), recordType: 'user', reference: formValues.name,
      action: 'User details amended', userId: existingUser.userId, userName: formValues.name,
      userRole: '', vesselReference: '', tripId: '', performedBy: 'Sam Smith',
      href: `new-user-profile?userId=${existingUser.userId}`
    })
    return res.redirect(`/catch-records/new-user-profile?userId=${existingUser.userId}&usersUpdated=amended`)
  }

  const nextUserId = String(Math.max(1239, ...existingUsers.map(user => Number(user.userId) || 0)) + 1)
  const user = {
    userId: nextUserId,
    name: formValues.name,
    email: formValues.email,
    telephone: formValues.telephone,
    addressLine1: formValues.addressLine1,
    addressLine2: formValues.addressLine2,
    city: formValues.city,
    postcode: formValues.postcode,
    administration: formValues.administration,
    status: 'invited',
    invitationEmailStatus: 'sent',
    invitationEmailSentOn: getNowDisplay(),
    assistedDigital: 'no',
    vessel: '',
    created: getTodayDate(),
    createdDisplay: getTodayDisplay(),
    createdVia: 'Web'
  }

  req.session.data.catchRecordsNewUsers = (req.session.data.catchRecordsNewUsers || []).concat(user)
  req.session.data.catchRecordsAuditEvents = (req.session.data.catchRecordsAuditEvents || []).concat({
    date: getTodayDate(),
    dateTime: getNowDisplay(),
    recordType: 'user',
    reference: user.name,
    action: 'User created',
    userId: user.userId,
    userName: user.name,
    userRole: '',
    vesselReference: '',
    tripId: '',
    performedBy: 'Sam Smith',
    href: `new-user-profile?userId=${user.userId}`
  }, {
    date: getTodayDate(),
    dateTime: user.invitationEmailSentOn,
    recordType: 'user',
    reference: user.name,
    action: 'Invitation email sent',
    userId: user.userId,
    userName: user.name,
    userRole: '',
    vesselReference: '',
    tripId: '',
    performedBy: 'Sam Smith',
    href: `new-user-profile?userId=${user.userId}`
  })

  req.session.save(error => error ? next(error) : res.redirect(`/catch-records/create-user-confirmation?userId=${user.userId}`))
})

router.get('/catch-records/create-user-confirmation', function (req, res) {
  const user = getCatchRecordsUsers(req).find(option => option.userId === req.query.userId)
  if (!user) return res.redirect('/catch-records/landing-page')
  res.render('catch-records/create-user-confirmation', { profileUser: user })
})

router.get('/catch-records/vessel-users', function (req, res) {
  const vessel = getCatchRecordsVessel(req.query.vessel)
  const action = req.query.action === 'remove' ? 'remove' : 'add'
  if (!vessel) return res.redirect('/catch-records/vessels')

  const role = getCatchRecordsRole(req)
  const allLinkedUsers = getCatchRecordsVesselUsers(req, vessel.reference)
  const skipperOnly = role.permissions.manageVessels === 'skipper'
  const linkedUsers = skipperOnly ? allLinkedUsers.filter(link => link.role === 'Skipper (Master)') : allLinkedUsers
  const users = getCatchRecordsUsers(req)
  renderVesselUsersPage(res, {
    vessel,
    action,
    skipperOnly,
    linkedUsers,
    availableUsers: users.filter(user => !allLinkedUsers.some(link => link.userId === user.userId)),
    errors: [],
    selectedUserId: '',
    selectedRole: ''
  })
})

router.get('/catch-records/user-vessels', function (req, res) {
  const user = getCatchRecordsUsers(req).find(option => option.userId === req.query.userId)
  if (!user) return res.redirect('/catch-records/landing-page')
  const role = getCatchRecordsRole(req)
  const action = req.query.action === 'remove' ? 'remove' : 'add'
  const skipperOnly = role.permissions.manageVessels === 'skipper'
  const vessels = Object.values(catchRecordsVessels).filter(vessel => {
    const link = getCatchRecordsVesselUsers(req, vessel.reference).find(link => link.userId === user.userId)
    return action === 'add' ? !link : link && (!skipperOnly || link.role === 'Skipper (Master)')
  })
  res.render('catch-records/user-vessels', { profileUser: user, vessels, action, skipperOnly })
})

router.post('/catch-records/vessel-users', function (req, res, next) {
  const vessel = getCatchRecordsVessel(req.body.vessel)
  const action = req.body.action === 'remove' ? 'remove' : 'add'
  if (!vessel) return res.redirect('/catch-records/vessels')

  const role = getCatchRecordsRole(req)
  const allLinkedUsers = getCatchRecordsVesselUsers(req, vessel.reference)
  const skipperOnly = role.permissions.manageVessels === 'skipper'
  if (role.permissions.manageVessels === 'none') return res.redirect('/catch-records/landing-page?access=denied')
  const linkedUsers = skipperOnly ? allLinkedUsers.filter(link => link.role === 'Skipper (Master)') : allLinkedUsers
  const users = getCatchRecordsUsers(req)
  const returnToUser = req.body['return-user-id'] === req.body['user-id'] && users.some(user => user.userId === req.body['return-user-id'])
  const returnUrl = returnToUser ? `/catch-records/new-user-profile?userId=${encodeURIComponent(req.body['return-user-id'])}` : ''
  const errors = []
  let selectedUserId = (req.body['user-id'] || '').trim()
  let selectedRole = skipperOnly ? 'Skipper (Master)' : (req.body.role || '').trim()

  if (action === 'add') {
    const user = users.find(option => option.userId === selectedUserId)
    if (!user) errors.push({ field: 'user-id', text: 'Select a user' })
    if (!['Owner (Nominee)', 'Skipper (Master)'].includes(selectedRole)) errors.push({ field: 'role', text: 'Select a user role' })
    if (user && allLinkedUsers.some(link => link.userId === user.userId)) errors.push({ field: 'user-id', text: 'This user is already linked to the vessel' })

    if (!errors.length) {
      const linkedOn = getTodayDisplay()
      const updatedUsers = allLinkedUsers.concat({ userId: user.userId, name: user.name, role: selectedRole, linkedOn })
      req.session.data.catchRecordsVesselUsers = req.session.data.catchRecordsVesselUsers || {}
      req.session.data.catchRecordsVesselUsers[vessel.reference] = updatedUsers
      req.session.data.catchRecordsAuditEvents = (req.session.data.catchRecordsAuditEvents || []).concat({
        date: getTodayDate(),
        dateTime: getNowDisplay(),
        recordType: 'vessel',
        reference: vessel.reference,
        action: 'Vessel added to user',
        userId: user.userId,
        userName: user.name,
        userRole: selectedRole,
        vesselReference: vessel.reference,
        tripId: '',
        performedBy: 'Sam Smith',
        href: `vessel-profile?vessel=${vessel.name.replace(/ /g, '+')}`
      })
      const redirectUrl = returnUrl ? `${returnUrl}&usersUpdated=added` : `/catch-records/vessel-profile?vessel=${vessel.name.replace(/ /g, '+')}&usersUpdated=added`
      return req.session.save(error => error ? next(error) : res.redirect(redirectUrl))
    }
  } else {
    selectedUserId = (req.body['user-id'] || '').trim()
    const user = linkedUsers.find(option => option.userId === selectedUserId)
    if (!user) errors.push({ field: 'user-id', text: 'Select a user to remove' })

    if (!errors.length) {
      req.session.data.catchRecordsVesselUsers = req.session.data.catchRecordsVesselUsers || {}
      req.session.data.catchRecordsVesselUsers[vessel.reference] = allLinkedUsers.filter(link => link.userId !== user.userId)
      req.session.data.catchRecordsAuditEvents = (req.session.data.catchRecordsAuditEvents || []).concat({
        date: getTodayDate(),
        dateTime: getNowDisplay(),
        recordType: 'vessel',
        reference: vessel.reference,
        action: 'Vessel removed from user',
        userId: user.userId,
        userName: user.name,
        userRole: user.role,
        vesselReference: vessel.reference,
        tripId: '',
        performedBy: 'Sam Smith',
        href: `vessel-profile?vessel=${vessel.name.replace(/ /g, '+')}`
      })
      const redirectUrl = returnUrl ? `${returnUrl}&usersUpdated=removed` : `/catch-records/vessel-profile?vessel=${vessel.name.replace(/ /g, '+')}&usersUpdated=removed`
      return req.session.save(error => error ? next(error) : res.redirect(redirectUrl))
    }
  }

  renderVesselUsersPage(res, {
    vessel,
    action,
    skipperOnly,
    linkedUsers,
    availableUsers: users.filter(user => !allLinkedUsers.some(link => link.userId === user.userId)),
    errors,
    selectedUserId,
    selectedRole
  })
})

router.get('/catch-records/user-profile', function (req, res) {
  const original = catchRecordsUserDirectory.find(user => user.name === req.query.user) || (!req.query.user ? catchRecordsUserDirectory[0] : null)
  if (original && (req.session.data.catchRecordsUserEdits || {})[original.userId]) return res.redirect(`/catch-records/new-user-profile?userId=${original.userId}`)
  res.render('catch-records/user-profile', { catchRecordsProfileUser: res.locals.catchRecordsProfileUser || (!req.query.user ? getCatchRecordsUsers(req)[0] : null) })
})

router.get('/catch-records/new-user-profile', function (req, res) {
  const user = getCatchRecordsUsers(req).find(option => option.userId === req.query.userId)
  if (!user) return res.redirect('/catch-records/landing-page')
  const vesselLinks = Object.values(catchRecordsVessels)
    .flatMap(vessel => getCatchRecordsVesselUsers(req, vessel.reference)
      .filter(link => link.userId === user.userId)
      .map(link => ({ ...link, reference: vessel.reference, vesselName: vessel.name })))
  res.render('catch-records/new-user-profile', {
    profileUser: user,
    vesselLinks,
    profileTrips: Object.values(catchRecordsTrips).filter(trip => trip.userId === user.userId),
    profileHistory: res.locals.catchRecordsAuditEvents.filter(event => event.userId === user.userId),
    profileNotes: (req.session.data.catchRecordsUserNotes || {})[user.userId] || []
  })
})

router.post('/catch-records/banner-message', function (req, res, next) {
  const message = (req.body['service-message'] || '').trim()
  if (!message) return res.redirect('/catch-records/banner-message')

  req.session.data['service-message'] = message
  req.session.save(error => error ? next(error) : res.redirect('/catch-records/banner-message?updated=1'))
})

router.post('/catch-records/user-note', function (req, res) {
  const user = getCatchRecordsUsers(req).find(user => user.userId === req.body['user-id'])
  if (!user) return res.redirect('/catch-records/landing-page')
  const text = (req.body.note || '').trim()
  if (text) {
    req.session.data.catchRecordsUserNotes = req.session.data.catchRecordsUserNotes || {}
    req.session.data.catchRecordsUserNotes[user.userId] = [{ text, author: 'Sam Smith', dateTime: getNowDisplay() }].concat(req.session.data.catchRecordsUserNotes[user.userId] || [])
  }
  res.redirect(`/catch-records/new-user-profile?userId=${user.userId}#notes`)
})

router.get('/catch-records/trip-profile', function (req, res) {
  const tripRecord = getCatchRecordsTrip(req.query.trip)
  const tripVessel = getCatchRecordsVessel(tripRecord.vesselName)
  const tripVesselUser = tripVessel
    ? getCatchRecordsVesselUsers(req, tripVessel.reference).find(user => user.userId === tripRecord.userId)
    : null
  const tripVersion = req.query.version || ''
  const selectedVersion = tripVersion === 'original'
    ? tripRecord.originalVersion
    : tripRecord.amendments.find(version => version.key === tripVersion) || tripRecord.amendments[0] || tripRecord.originalVersion
  const hasRetainedWeight = tripRecord.catches.some(catchRecord => {
    let retainedWeight = catchRecord.retained
    if (['original', 'amendment-1', 'amendment-2'].includes(tripVersion) && catchRecord.originalRetained !== undefined) {
      retainedWeight = catchRecord.originalRetained
    }
    return retainedWeight !== undefined && retainedWeight !== null && retainedWeight !== ''
  })

  res.render('catch-records/trip-profile', {
    tripId: tripRecord.id,
    tripRecord,
    tripUserRole: tripVesselUser ? tripVesselUser.role : 'Not linked',
    hasRetainedWeight,
    hasWeightBelowMinimumSize: tripRecord.catches.some(catchRecord => catchRecord.weightBelowMinimumSize !== undefined && catchRecord.weightBelowMinimumSize !== null && catchRecord.weightBelowMinimumSize !== ''),
    hasWeightDiscarded: tripRecord.catches.some(catchRecord => catchRecord.weightDiscarded !== undefined && catchRecord.weightDiscarded !== null && catchRecord.weightDiscarded !== ''),
    gearDisplay: req.query.gearDisplay === 'old' ? 'old' : 'grouped',
    tripLayout: ['b', 'b2', 'c', 'd', 'e', 'e2', 'f', 'f2'].includes(req.query.layout) ? req.query.layout : 'a',
    selectedVersion,
    tripVersion,
    tripStatus: req.query.status || selectedVersion.status.toLowerCase()
  })
})

router.get('/catch-records/trip-amendments', function (req, res) {
  const tripRecord = getCatchRecordsTrip(req.query.trip)
  res.render('catch-records/trip-amendments', {
    tripId: tripRecord.id,
    tripRecord
  })
})


function getCatchRecordsV2Role (req) {
  const host = req.headers.host || 'default'
  const roleByHost = req.session.data.catchRecordsV2Namespace.catchRecordsRoleByHost
  const roleKey = roleByHost ? roleByHost[host] : req.session.data.catchRecordsV2Namespace.catchRecordsRole
  return catchRecordsRoles[roleKey] || catchRecordsRoles.serviceManager
}

function getCatchRecordsV2Users (req) {
  const deactivatedUserIds = new Set(req.session.data.catchRecordsV2Namespace.catchRecordsDeactivatedUserIds || [])
  return catchRecordsUserDirectory.concat(req.session.data.catchRecordsV2Namespace.catchRecordsNewUsers || []).map(user => (
    { ...user, ...(req.session.data.catchRecordsV2Namespace.catchRecordsUserEdits || {})[user.userId], ...(deactivatedUserIds.has(user.userId) ? { status: 'deactivated' } : {}) }
  ))
}

function getCatchRecordsV2Vessel (value) {
  return Object.values(catchRecordsVessels).find(vessel => vessel.name === value || vessel.reference === value)
}

function getCatchRecordsV2VesselUsers (req, vesselReference) {
  const savedUsers = req.session.data.catchRecordsV2Namespace.catchRecordsVesselUsers || {}
  const savedLinks = savedUsers[vesselReference]
  const users = Array.isArray(savedLinks) ? savedLinks : defaultCatchRecordsVesselUsers[vesselReference] || []
  const createdUserIds = new Set((req.session.data.catchRecordsV2Namespace.catchRecordsNewUsers || []).map(user => user.userId))
  return users.map(user => ({ ...user, name: ((req.session.data.catchRecordsV2Namespace.catchRecordsUserEdits || {})[user.userId] || {}).name || user.name, reference: vesselReference, isNewUser: createdUserIds.has(user.userId) }))
}

function canCatchRecordsV2RoleDeactivateUser (req, role, userId) {
  if (role.permissions.deactivateUsers === true) return true
  if (role.permissions.deactivateUsers !== 'limited' || !userId) return false
  const vesselLinks = Object.values(catchRecordsVessels).flatMap(vessel => getCatchRecordsV2VesselUsers(req, vessel.reference).filter(user => user.userId === userId))
  return vesselLinks.length === 0 || vesselLinks.every(user => user.role === 'Skipper (Master)')
}

router.use('/catch-records-v2', function (req, res, next) {
  if (req.session && req.session.cookie) req.session.cookie.maxAge = catchRecordsSessionMaxAge
  req.session.data.catchRecordsV2Namespace = req.session.data.catchRecordsV2Namespace || {}
  const data = req.session.data.catchRecordsV2Namespace
  if (data.catchRecordsSignedIn) {
    if (!data.catchRecordsAuthenticatedAt) data.catchRecordsAuthenticatedAt = Date.now()
    if (Date.now() - data.catchRecordsAuthenticatedAt >= catchRecordsSessionMaxAge) {
      delete data.catchRecordsSignedIn
      delete data.catchRecordsUserEmail
      delete data.catchRecordsRole
      delete data.catchRecordsRoleByHost
      delete data.catchRecordsAuthenticatedAt
    }
  }
  res.locals.data = { ...data, ...req.query }
  next()
})

router.get('/catch-records-v2/sign-in', function (req, res) {
  if (req.session.data.catchRecordsV2Namespace.catchRecordsSignedIn) return res.redirect('/catch-records-v2/landing-page')

  const errors = req.session.data.catchRecordsV2Namespace.catchRecordsSignInErrors || []
  delete req.session.data.catchRecordsV2Namespace.catchRecordsSignInErrors
  res.render('catch-records-v2/sign-in', {
    errors,
    email: req.session.data.catchRecordsV2Namespace.catchRecordsSignInEmail || ''
  })
})

router.post('/catch-records-v2/sign-in', function (req, res) {
  const email = (req.body['catch-records-sign-in-email'] || '').trim()
  const password = req.body['catch-records-sign-in-password'] || ''
  delete req.session.data.catchRecordsV2Namespace['catch-records-sign-in-password']

  const errors = []
  if (!email) {
    errors.push({ field: 'email', text: 'Enter your email address' })
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push({ field: 'email', text: 'Enter an email address in the correct format' })
  }
  if (!password) errors.push({ field: 'password', text: 'Enter your password' })

  if (errors.length) {
    req.session.data.catchRecordsV2Namespace.catchRecordsSignInErrors = errors
    req.session.data.catchRecordsV2Namespace.catchRecordsSignInEmail = email
    return res.redirect('/catch-records-v2/sign-in')
  }

  delete req.session.data.catchRecordsV2Namespace.catchRecordsSignInEmail
  req.session.data.catchRecordsV2Namespace.catchRecordsSignedIn = true
  req.session.data.catchRecordsV2Namespace.catchRecordsUserEmail = email
  delete req.session.data.catchRecordsV2Namespace.catchRecordsRoleByHost
  delete req.session.data.catchRecordsV2Namespace.catchRecordsRole
  req.session.data.catchRecordsV2Namespace.catchRecordsAuthenticatedAt = Date.now()
  res.redirect('/catch-records-v2/index')
})

router.post('/catch-records-v2/sign-out', function (req, res) {
  delete req.session.data.catchRecordsV2Namespace.catchRecordsSignedIn
  delete req.session.data.catchRecordsV2Namespace.catchRecordsUserEmail
  delete req.session.data.catchRecordsV2Namespace.catchRecordsRole
  delete req.session.data.catchRecordsV2Namespace.catchRecordsRoleByHost
  delete req.session.data.catchRecordsV2Namespace.catchRecordsAuthenticatedAt
  res.redirect('/catch-records-v2/sign-in')
})

router.get('/catch-records-v2/role-preview', function (req, res) {
  const role = catchRecordsRoles[req.query.role]
  if (!role) return res.redirect('/catch-records-v2/index')

  req.session.data.catchRecordsV2Namespace.catchRecordsSignedIn = true
  req.session.data.catchRecordsV2Namespace.catchRecordsUserEmail = 'preview@example.test'
  const host = req.headers.host || 'default'
  req.session.data.catchRecordsV2Namespace.catchRecordsRoleByHost = { ...(req.session.data.catchRecordsV2Namespace.catchRecordsRoleByHost || {}), [host]: role.key }
  req.session.data.catchRecordsV2Namespace.catchRecordsAuthenticatedAt = Date.now()
  res.redirect('/catch-records-v2/landing-page')
})


router.use('/catch-records-v2', function (req, res, next) {
  if (req.session.data.catchRecordsV2Namespace.catchRecordsSignedIn) {
    const role = getCatchRecordsV2Role(req)
    const navigationByPath = {
      '/catch-records-v2/landing-page': 'users',
      '/catch-records-v2/create-user': 'users',
      '/catch-records-v2/edit-user': 'users',
      '/catch-records-v2/user-vessels': 'users',
      '/catch-records-v2/deactivate-user': 'users',
      '/catch-records-v2/reactivate-user': 'users',
      '/catch-records-v2/new-user-profile': 'users',
      '/catch-records-v2/user-note': 'users',
      '/catch-records-v2/user-profile': 'users',
      '/catch-records-v2/vessels': 'vessels',
      '/catch-records-v2/vessel-profile': 'vessels',
      '/catch-records-v2/vessel-users': 'vessels',
      '/catch-records-v2/fishing-trips': 'fishing-trips',
      '/catch-records-v2/trip-profile': 'fishing-trips',
      '/catch-records-v2/trip-amendments': 'fishing-trips',
      '/catch-records-v2/trip-breakdown': 'trip-breakdown',
      '/catch-records-v2/trip-layout-archive': 'fishing-trips',
      '/catch-records-v2/audit-log': 'audit-log',
      '/catch-records-v2/banner-message': 'banner-message'
    }
    const requestPath = req.originalUrl.split('?')[0]
    const requiredNavigation = navigationByPath[requestPath]
    if (requiredNavigation && !role.navigation.includes(requiredNavigation)) return res.redirect('/catch-records-v2/landing-page?access=denied')
    if (requestPath === '/catch-records-v2/create-user' && !role.permissions.createUsers) return res.redirect('/catch-records-v2/landing-page?access=denied')
    if (requestPath === '/catch-records-v2/edit-user' && !role.permissions.editUsers) return res.redirect('/catch-records-v2/landing-page?access=denied')
    if (requestPath === '/catch-records-v2/user-note' && role.readOnly) return res.redirect('/catch-records-v2/landing-page?access=denied')
    if (requestPath === '/catch-records-v2/user-vessels' && role.permissions.manageVessels === 'none') return res.redirect('/catch-records-v2/landing-page?access=denied')
    if (requestPath === '/catch-records-v2/deactivate-user') {
      const users = getCatchRecordsV2Users(req)
      const requestedUser = req.method === 'POST'
        ? users.find(user => user.userId === (req.body || {})['user-id'])
        : users.find(user => user.userId === req.query.userId || user.name === req.query.user)
      if (!requestedUser || !canCatchRecordsV2RoleDeactivateUser(req, role, requestedUser.userId)) return res.redirect('/catch-records-v2/landing-page?access=denied')
    }
    if (requestPath === '/catch-records-v2/reactivate-user' && role.permissions.reactivateUsers !== true) return res.redirect('/catch-records-v2/landing-page?access=denied')
    if (requestPath === '/catch-records-v2/vessel-users' && role.permissions.manageVessels === 'none') return res.redirect('/catch-records-v2/landing-page?access=denied')

    const sessionEvents = req.session.data.catchRecordsV2Namespace.catchRecordsAuditEvents || []
    const combinedEvents = catchRecordsAuditEventsChronological.concat(sessionEvents).sort((first, second) => {
      const firstTime = `${first.date}T${first.dateTime.match(/\d{2}:\d{2}$/)[0]}`
      const secondTime = `${second.date}T${second.dateTime.match(/\d{2}:\d{2}$/)[0]}`
      return firstTime.localeCompare(secondTime)
    })
    const currentUsers = getCatchRecordsV2Users(req)
    const vesselUsersByReference = {}

    Object.values(catchRecordsVessels).forEach(vessel => {
      vesselUsersByReference[vessel.reference] = getCatchRecordsV2VesselUsers(req, vessel.reference)
    })

    const currentUser = currentUsers.find(user => user.name === req.query.user || user.userId === req.query.userId)
    res.locals.catchRecordsTripUserRoleById = Object.fromEntries(Object.values(catchRecordsTrips).map(trip => {
      const tripVessel = getCatchRecordsV2Vessel(trip.vesselName)
      const tripUser = tripVessel && getCatchRecordsV2VesselUsers(req, tripVessel.reference).find(user => user.userId === trip.userId)
      return [trip.id, tripUser ? tripUser.role : 'Not linked']
    }))
    res.locals.catchRecordsProfileUser = currentUser
    res.locals.catchRecordsUsersByOriginalName = Object.fromEntries(catchRecordsUserDirectory.map(user => [user.name, currentUsers.find(current => current.userId === user.userId)]))
    const currentVessel = getCatchRecordsV2Vessel(req.query.vessel)
    res.locals.catchRecordsAuditEvents = combinedEvents.slice().reverse()
    res.locals.catchRecordsTripBreakdownExportByRow = catchRecordsTripBreakdownExportByRow
    res.locals.catchRecordsRole = role
    res.locals.catchRecordsRoleNavigation = catchRecordsRoleNavigation.filter(item => role.navigation.includes(item.key))
    res.locals.catchRecordsUserStatusByName = Object.fromEntries(currentUsers.map(user => [user.name, user.status]))
    res.locals.catchRecordsCanDeactivateUser = currentUser ? canCatchRecordsV2RoleDeactivateUser(req, role, currentUser.userId) : false
    res.locals.catchRecordsAuditEventsChronological = combinedEvents
    res.locals.catchRecordsNewUsers = currentUsers.filter(user => (req.session.data.catchRecordsV2Namespace.catchRecordsNewUsers || []).some(created => created.userId === user.userId))
    res.locals.catchRecordsVesselUsers = getCatchRecordsV2VesselUsers(req, currentVessel ? currentVessel.reference : req.query.vessel === 'Quatro' ? 'WY43' : 'PZ1')
    res.locals.catchRecordsVesselUsersByReference = vesselUsersByReference
    res.locals.catchRecordsUsersUpdated = req.query.usersUpdated || ''
    res.locals.catchRecordsUserVesselLinks = currentUser
      ? Object.entries(vesselUsersByReference).flatMap(([reference, users]) => users
        .filter(user => user.userId === currentUser.userId)
        .map(user => ({ ...user, reference, vesselName: Object.values(catchRecordsVessels).find(vessel => vessel.reference === reference).name })))
      : []
    res.locals.catchRecordsCurrentVessel = currentVessel
    return next()
  }
  res.redirect('/catch-records-v2/sign-in')
})

router.get('/catch-records-v2/deactivate-user', function (req, res) {
  const user = getCatchRecordsV2Users(req).find(option => option.userId === req.query.userId || option.name === req.query.user)
  const role = getCatchRecordsV2Role(req)
  if (!user || !canCatchRecordsV2RoleDeactivateUser(req, role, user.userId)) return res.redirect('/catch-records-v2/landing-page')

  const isNewUser = (req.session.data.catchRecordsV2Namespace.catchRecordsNewUsers || []).some(option => option.userId === user.userId)
  const profileUrl = isNewUser
    ? `new-user-profile?userId=${user.userId}`
    : `user-profile?user=${user.name.replace(/ /g, '+')}&status=${user.status}`
  if (user.status === 'deactivated') return res.redirect(profileUrl)

  res.render('catch-records-v2/deactivate-user', { profileUser: user, profileUrl })
})

router.post('/catch-records-v2/deactivate-user', function (req, res) {
  const user = getCatchRecordsV2Users(req).find(option => option.userId === req.body['user-id'])
  const role = getCatchRecordsV2Role(req)
  if (!user || !canCatchRecordsV2RoleDeactivateUser(req, role, user.userId)) return res.redirect('/catch-records-v2/landing-page')

  const isNewUser = (req.session.data.catchRecordsV2Namespace.catchRecordsNewUsers || []).some(option => option.userId === user.userId)
  const profileUrl = isNewUser
    ? `new-user-profile?userId=${user.userId}`
    : `user-profile?user=${user.name.replace(/ /g, '+')}&status=deactivated`
  if (user.status !== 'deactivated') {
    req.session.data.catchRecordsV2Namespace.catchRecordsDeactivatedUserIds = Array.from(new Set([...(req.session.data.catchRecordsV2Namespace.catchRecordsDeactivatedUserIds || []), user.userId]))
    req.session.data.catchRecordsV2Namespace.catchRecordsAuditEvents = (req.session.data.catchRecordsV2Namespace.catchRecordsAuditEvents || []).concat({
      date: getTodayDate(),
      dateTime: getNowDisplay(),
      recordType: 'user',
      reference: user.name,
      action: 'User deactivated',
      change: 'User deactivated',
      userId: user.userId,
      userName: user.name,
      userRole: '',
      vesselReference: '',
      tripId: '',
      performedBy: 'Sam Smith',
      href: profileUrl
    })
  }
  res.redirect(`${profileUrl}&usersUpdated=deactivated`)
})

router.get('/catch-records-v2/reactivate-user', function (req, res) {
  const user = getCatchRecordsV2Users(req).find(option => option.userId === req.query.userId || option.name === req.query.user)
  if (!user || (user.status !== 'deactivated' && req.query.status !== 'deactivated')) return res.redirect('/catch-records-v2/landing-page')
  const profileUser = { ...user, status: 'deactivated' }

  const originalUser = catchRecordsUserDirectory.concat(req.session.data.catchRecordsV2Namespace.catchRecordsNewUsers || []).find(option => option.userId === user.userId)
  const isNewUser = (req.session.data.catchRecordsV2Namespace.catchRecordsNewUsers || []).some(option => option.userId === user.userId)
  const profileUrl = isNewUser
    ? `new-user-profile?userId=${user.userId}`
    : `user-profile?user=${user.name.replace(/ /g, '+')}&status=${originalUser.status}`
  res.render('catch-records-v2/reactivate-user', { profileUser, profileUrl })
})

router.post('/catch-records-v2/reactivate-user', function (req, res) {
  const user = getCatchRecordsV2Users(req).find(option => option.userId === req.body['user-id'])
  if (!user || (user.status !== 'deactivated' && req.body['user-status'] !== 'deactivated')) return res.redirect('/catch-records-v2/landing-page')

  const originalUser = catchRecordsUserDirectory.concat(req.session.data.catchRecordsV2Namespace.catchRecordsNewUsers || []).find(option => option.userId === user.userId)
  const isNewUser = (req.session.data.catchRecordsV2Namespace.catchRecordsNewUsers || []).some(option => option.userId === user.userId)
  const profileUrl = isNewUser
    ? `new-user-profile?userId=${user.userId}`
    : `user-profile?user=${user.name.replace(/ /g, '+')}&status=${originalUser.status}`
  req.session.data.catchRecordsV2Namespace.catchRecordsDeactivatedUserIds = (req.session.data.catchRecordsV2Namespace.catchRecordsDeactivatedUserIds || []).filter(userId => userId !== user.userId)
  req.session.data.catchRecordsV2Namespace.catchRecordsAuditEvents = (req.session.data.catchRecordsV2Namespace.catchRecordsAuditEvents || []).concat({
    date: getTodayDate(),
    dateTime: getNowDisplay(),
    recordType: 'user',
    reference: user.name,
    action: 'User reactivated',
    change: 'User reactivated',
    userId: user.userId,
    userName: user.name,
    userRole: '',
    vesselReference: '',
    tripId: '',
    performedBy: 'Sam Smith',
    href: profileUrl
  })
  res.redirect(`${profileUrl}&usersUpdated=reactivated`)
})

router.get('/catch-records-v2/sortable-table.mjs', function (req, res) {
  res.sendFile(require.resolve('@ministryofjustice/frontend/moj/components/sortable-table/sortable-table.bundle.mjs'))
})

router.get('/catch-records-v2/moj-frontend.css', function (req, res) {
  res.sendFile(require.resolve('@ministryofjustice/frontend/moj/moj-frontend.min.css'))
})

router.get('/catch-records-v2/create-user', function (req, res) {
  const errors = req.session.data.catchRecordsV2Namespace.catchRecordsCreateUserErrors || []
  const formValues = req.session.data.catchRecordsV2Namespace.catchRecordsCreateUserValues || {}
  delete req.session.data.catchRecordsV2Namespace.catchRecordsCreateUserErrors
  delete req.session.data.catchRecordsV2Namespace.catchRecordsCreateUserValues
  res.render('catch-records-v2/create-user', { errors, formValues })
})

router.get('/catch-records-v2/edit-user', function (req, res) {
  const user = getCatchRecordsV2Users(req).find(option => option.userId === req.query.userId)
  if (!user) return res.redirect('/catch-records-v2/landing-page')
  res.render('catch-records-v2/create-user', { editing: true, profileUser: user, errors: [], formValues: user })
})

router.post(['/catch-records-v2/create-user', '/catch-records-v2/edit-user'], function (req, res, next) {
  const editing = req.path === '/catch-records-v2/edit-user'
  const existingUser = editing ? getCatchRecordsV2Users(req).find(user => user.userId === req.body['user-id']) : null
  if (editing && !existingUser) return res.redirect('/catch-records-v2/landing-page')
  const formValues = {
    name: (req.body['full-name'] || '').trim(),
    email: (req.body['email-address'] || '').trim(),
    ...(!editing ? { assistedDigital: (req.body['assisted-digital'] || '').trim() } : {}),
    telephone: (req.body['telephone-number'] || '').trim(),
    addressLine1: (req.body['address-line-1'] || '').trim(),
    addressLine2: (req.body['address-line-2'] || '').trim(),
    city: (req.body['address-town-city'] || '').trim(),
    postcode: (req.body['address-postcode'] || '').trim(),
    administration: (req.body.administration || '').trim()
  }
  const errors = []
  const existingUsers = getCatchRecordsV2Users(req)
  const role = getCatchRecordsV2Role(req)
  if (editing && role.permissions.editUsers === 'limited') formValues.administration = existingUser.administration

  if (!formValues.name) errors.push({ field: 'full-name', text: 'Enter a full name or company name' })
  if (!editing && !['yes', 'no'].includes(formValues.assistedDigital)) errors.push({ field: 'assisted-digital', text: 'Select whether the user needs assisted digital support' })
  if (!editing || formValues.addressLine1 || formValues.city || formValues.postcode) {
    if (!formValues.addressLine1) errors.push({ field: 'address-line-1', text: 'Enter the first line of the address' })
    if (!formValues.city) errors.push({ field: 'address-town-city', text: 'Enter a town or city' })
    if (!formValues.postcode) errors.push({ field: 'address-postcode', text: 'Enter a postcode' })
  }
  if (!formValues.email && (editing || formValues.assistedDigital !== 'yes')) {
    errors.push({ field: 'email-address', text: 'Enter an email address' })
  } else if (formValues.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formValues.email)) {
    errors.push({ field: 'email-address', text: 'Enter an email address in the correct format' })
  } else if (formValues.email && existingUsers.some(user => user.userId !== (existingUser || {}).userId && user.email && user.email.toLowerCase() === formValues.email.toLowerCase())) {
    errors.push({ field: 'email-address', text: 'A user with this email address already exists' })
  }
  const administrations = !editing && ['fdst', 'fishingVesselLicensing'].includes(role.key)
    ? ['England', 'Wales', 'Isle of Man']
    : ['England', 'Wales', 'Scotland', 'Northern Ireland', 'Isle of Man']
  if (!administrations.includes(formValues.administration)) errors.push({ field: 'administration', text: 'Select an administration' })

  if (errors.length) {
    if (editing) return res.render('catch-records-v2/create-user', { editing, profileUser: existingUser, errors, formValues })
    req.session.data.catchRecordsV2Namespace.catchRecordsCreateUserErrors = errors
    req.session.data.catchRecordsV2Namespace.catchRecordsCreateUserValues = formValues
    return req.session.save(error => error ? next(error) : res.redirect('/catch-records-v2/create-user'))
  }

  if (editing) {
    req.session.data.catchRecordsV2Namespace.catchRecordsUserEdits = { ...(req.session.data.catchRecordsV2Namespace.catchRecordsUserEdits || {}), [existingUser.userId]: formValues }
    req.session.data.catchRecordsV2Namespace.catchRecordsAuditEvents = (req.session.data.catchRecordsV2Namespace.catchRecordsAuditEvents || []).concat({
      date: getTodayDate(), dateTime: getNowDisplay(), recordType: 'user', reference: formValues.name,
      action: 'User details amended', userId: existingUser.userId, userName: formValues.name,
      userRole: '', vesselReference: '', tripId: '', performedBy: 'Sam Smith',
      href: `new-user-profile?userId=${existingUser.userId}`
    })
    return res.redirect(`/catch-records-v2/new-user-profile?userId=${existingUser.userId}&usersUpdated=amended`)
  }

  const nextUserId = String(Math.max(1239, ...existingUsers.map(user => Number(user.userId) || 0)) + 1)
  const user = {
    userId: nextUserId,
    name: formValues.name,
    email: formValues.email,
    telephone: formValues.telephone,
    addressLine1: formValues.addressLine1,
    addressLine2: formValues.addressLine2,
    city: formValues.city,
    postcode: formValues.postcode,
    administration: formValues.administration,
    status: formValues.email ? 'invited' : 'created',
    ...(formValues.email ? { invitationEmailStatus: 'sent', invitationEmailSentOn: getNowDisplay() } : {}),
    assistedDigital: formValues.assistedDigital,
    vessel: '',
    created: getTodayDate(),
    createdDisplay: getTodayDisplay(),
    createdVia: 'Web'
  }

  req.session.data.catchRecordsV2Namespace.catchRecordsNewUsers = (req.session.data.catchRecordsV2Namespace.catchRecordsNewUsers || []).concat(user)
  const userAuditEvents = [{
    date: getTodayDate(),
    dateTime: getNowDisplay(),
    recordType: 'user',
    reference: user.name,
    action: 'User created',
    userId: user.userId,
    userName: user.name,
    userRole: '',
    vesselReference: '',
    tripId: '',
    performedBy: 'Sam Smith',
    href: `new-user-profile?userId=${user.userId}`
  }]
  if (user.invitationEmailSentOn) {
    userAuditEvents.push({
      date: getTodayDate(),
      dateTime: user.invitationEmailSentOn,
      recordType: 'user',
      reference: user.name,
      action: 'Invitation email sent',
      userId: user.userId,
      userName: user.name,
      userRole: '',
      vesselReference: '',
      tripId: '',
      performedBy: 'Sam Smith',
      href: `new-user-profile?userId=${user.userId}`
    })
  }
  req.session.data.catchRecordsV2Namespace.catchRecordsAuditEvents = (req.session.data.catchRecordsV2Namespace.catchRecordsAuditEvents || []).concat(userAuditEvents)

  req.session.save(error => error ? next(error) : res.redirect(`/catch-records-v2/create-user-confirmation?userId=${user.userId}`))
})

router.get('/catch-records-v2/create-user-confirmation', function (req, res) {
  const user = getCatchRecordsV2Users(req).find(option => option.userId === req.query.userId)
  if (!user) return res.redirect('/catch-records-v2/landing-page')
  res.render('catch-records-v2/create-user-confirmation', { profileUser: user })
})

router.get('/catch-records-v2/vessel-users', function (req, res) {
  const vessel = getCatchRecordsV2Vessel(req.query.vessel)
  const action = req.query.action === 'remove' ? 'remove' : 'add'
  if (!vessel) return res.redirect('/catch-records-v2/vessels')

  const role = getCatchRecordsV2Role(req)
  const allLinkedUsers = getCatchRecordsV2VesselUsers(req, vessel.reference)
  const skipperOnly = role.permissions.manageVessels === 'skipper'
  const linkedUsers = skipperOnly ? allLinkedUsers.filter(link => link.role === 'Skipper (Master)') : allLinkedUsers
  const users = getCatchRecordsV2Users(req)
  renderVesselUsersPage(res, {
    vessel,
    action,
    skipperOnly,
    linkedUsers,
    availableUsers: users.filter(user => !allLinkedUsers.some(link => link.userId === user.userId)),
    errors: [],
    selectedUserId: '',
    selectedRole: ''
  })
})

router.get('/catch-records-v2/user-vessels', function (req, res) {
  const user = getCatchRecordsV2Users(req).find(option => option.userId === req.query.userId)
  if (!user) return res.redirect('/catch-records-v2/landing-page')
  const role = getCatchRecordsV2Role(req)
  const action = req.query.action === 'remove' ? 'remove' : 'add'
  const skipperOnly = role.permissions.manageVessels === 'skipper'
  const vessels = Object.values(catchRecordsVessels).filter(vessel => {
    const link = getCatchRecordsV2VesselUsers(req, vessel.reference).find(link => link.userId === user.userId)
    return action === 'add' ? !link : link && (!skipperOnly || link.role === 'Skipper (Master)')
  })
  res.render('catch-records-v2/user-vessels', { profileUser: user, vessels, action, skipperOnly })
})

router.post('/catch-records-v2/vessel-users', function (req, res, next) {
  const vessel = getCatchRecordsV2Vessel(req.body.vessel)
  const action = req.body.action === 'remove' ? 'remove' : 'add'
  if (!vessel) return res.redirect('/catch-records-v2/vessels')

  const role = getCatchRecordsV2Role(req)
  const allLinkedUsers = getCatchRecordsV2VesselUsers(req, vessel.reference)
  const skipperOnly = role.permissions.manageVessels === 'skipper'
  if (role.permissions.manageVessels === 'none') return res.redirect('/catch-records-v2/landing-page?access=denied')
  const linkedUsers = skipperOnly ? allLinkedUsers.filter(link => link.role === 'Skipper (Master)') : allLinkedUsers
  const users = getCatchRecordsV2Users(req)
  const returnToUser = req.body['return-user-id'] === req.body['user-id'] && users.some(user => user.userId === req.body['return-user-id'])
  const returnUrl = returnToUser ? `/catch-records-v2/new-user-profile?userId=${encodeURIComponent(req.body['return-user-id'])}` : ''
  const errors = []
  let selectedUserId = (req.body['user-id'] || '').trim()
  let selectedRole = skipperOnly ? 'Skipper (Master)' : (req.body.role || '').trim()

  if (action === 'add') {
    const user = users.find(option => option.userId === selectedUserId)
    if (!user) errors.push({ field: 'user-id', text: 'Select a user' })
    if (!['Owner (Nominee)', 'Skipper (Master)'].includes(selectedRole)) errors.push({ field: 'role', text: 'Select a user role' })
    if (user && allLinkedUsers.some(link => link.userId === user.userId)) errors.push({ field: 'user-id', text: 'This user is already linked to the vessel' })

    if (!errors.length) {
      const linkedOn = getTodayDisplay()
      const updatedUsers = allLinkedUsers.concat({ userId: user.userId, name: user.name, role: selectedRole, linkedOn })
      req.session.data.catchRecordsV2Namespace.catchRecordsVesselUsers = req.session.data.catchRecordsV2Namespace.catchRecordsVesselUsers || {}
      req.session.data.catchRecordsV2Namespace.catchRecordsVesselUsers[vessel.reference] = updatedUsers
      req.session.data.catchRecordsV2Namespace.catchRecordsAuditEvents = (req.session.data.catchRecordsV2Namespace.catchRecordsAuditEvents || []).concat({
        date: getTodayDate(),
        dateTime: getNowDisplay(),
        recordType: 'vessel',
        reference: vessel.reference,
        action: 'Vessel added to user',
        userId: user.userId,
        userName: user.name,
        userRole: selectedRole,
        vesselReference: vessel.reference,
        tripId: '',
        performedBy: 'Sam Smith',
        href: `vessel-profile?vessel=${vessel.name.replace(/ /g, '+')}`
      })
      const redirectUrl = returnUrl ? `${returnUrl}&usersUpdated=added` : `/catch-records-v2/vessel-profile?vessel=${vessel.name.replace(/ /g, '+')}&usersUpdated=added`
      return req.session.save(error => error ? next(error) : res.redirect(redirectUrl))
    }
  } else {
    selectedUserId = (req.body['user-id'] || '').trim()
    const user = linkedUsers.find(option => option.userId === selectedUserId)
    if (!user) errors.push({ field: 'user-id', text: 'Select a user to remove' })

    if (!errors.length) {
      req.session.data.catchRecordsV2Namespace.catchRecordsVesselUsers = req.session.data.catchRecordsV2Namespace.catchRecordsVesselUsers || {}
      req.session.data.catchRecordsV2Namespace.catchRecordsVesselUsers[vessel.reference] = allLinkedUsers.filter(link => link.userId !== user.userId)
      req.session.data.catchRecordsV2Namespace.catchRecordsAuditEvents = (req.session.data.catchRecordsV2Namespace.catchRecordsAuditEvents || []).concat({
        date: getTodayDate(),
        dateTime: getNowDisplay(),
        recordType: 'vessel',
        reference: vessel.reference,
        action: 'Vessel removed from user',
        userId: user.userId,
        userName: user.name,
        userRole: user.role,
        vesselReference: vessel.reference,
        tripId: '',
        performedBy: 'Sam Smith',
        href: `vessel-profile?vessel=${vessel.name.replace(/ /g, '+')}`
      })
      const redirectUrl = returnUrl ? `${returnUrl}&usersUpdated=removed` : `/catch-records-v2/vessel-profile?vessel=${vessel.name.replace(/ /g, '+')}&usersUpdated=removed`
      return req.session.save(error => error ? next(error) : res.redirect(redirectUrl))
    }
  }

  renderVesselUsersPage(res, {
    vessel,
    action,
    skipperOnly,
    linkedUsers,
    availableUsers: users.filter(user => !allLinkedUsers.some(link => link.userId === user.userId)),
    errors,
    selectedUserId,
    selectedRole
  })
})

router.get('/catch-records-v2/user-profile', function (req, res) {
  const original = catchRecordsUserDirectory.find(user => user.name === req.query.user) || (!req.query.user ? catchRecordsUserDirectory[0] : null)
  if (original && (req.session.data.catchRecordsV2Namespace.catchRecordsUserEdits || {})[original.userId]) return res.redirect(`/catch-records-v2/new-user-profile?userId=${original.userId}`)
  res.render('catch-records-v2/user-profile', { catchRecordsProfileUser: res.locals.catchRecordsProfileUser || (!req.query.user ? getCatchRecordsV2Users(req)[0] : null) })
})

router.get('/catch-records-v2/new-user-profile', function (req, res) {
  const user = getCatchRecordsV2Users(req).find(option => option.userId === req.query.userId)
  if (!user) return res.redirect('/catch-records-v2/landing-page')
  const vesselLinks = Object.values(catchRecordsVessels)
    .flatMap(vessel => getCatchRecordsV2VesselUsers(req, vessel.reference)
      .filter(link => link.userId === user.userId)
      .map(link => ({ ...link, reference: vessel.reference, vesselName: vessel.name })))
  res.render('catch-records-v2/new-user-profile', {
    profileUser: user,
    vesselLinks,
    profileTrips: Object.values(catchRecordsTrips).filter(trip => trip.userId === user.userId),
    profileHistory: res.locals.catchRecordsAuditEvents.filter(event => event.userId === user.userId),
    profileNotes: (req.session.data.catchRecordsV2Namespace.catchRecordsUserNotes || {})[user.userId] || []
  })
})

router.post('/catch-records-v2/banner-message', function (req, res, next) {
  const message = (req.body['service-message'] || '').trim()
  if (!message) return res.redirect('/catch-records-v2/banner-message')

  req.session.data.catchRecordsV2Namespace['service-message'] = message
  req.session.save(error => error ? next(error) : res.redirect('/catch-records-v2/banner-message?updated=1'))
})

router.post('/catch-records-v2/user-note', function (req, res) {
  const user = getCatchRecordsV2Users(req).find(user => user.userId === req.body['user-id'])
  if (!user) return res.redirect('/catch-records-v2/landing-page')
  const text = (req.body.note || '').trim()
  if (text) {
    req.session.data.catchRecordsV2Namespace.catchRecordsUserNotes = req.session.data.catchRecordsV2Namespace.catchRecordsUserNotes || {}
    req.session.data.catchRecordsV2Namespace.catchRecordsUserNotes[user.userId] = [{ text, author: 'Sam Smith', authorRole: getCatchRecordsV2Role(req).name, dateTime: getNowDisplay() }].concat(req.session.data.catchRecordsV2Namespace.catchRecordsUserNotes[user.userId] || [])
  }
  res.redirect(`/catch-records-v2/new-user-profile?userId=${user.userId}#notes`)
})

router.get('/catch-records-v2/trip-profile', function (req, res) {
  const tripRecord = getCatchRecordsV2Trip(req.query.trip)
  if (req.query.gearExample === 'pots-trammel') {
    tripRecord.gears = tripRecord.gears.filter(gear => ['Pots', 'Trammel net'].includes(gear.type))
    const gearIds = new Set(tripRecord.gears.map(gear => gear.id))
    tripRecord.catches = tripRecord.catches.filter(catchRecord => gearIds.has(catchRecord.gearId))
  }
  const tripVessel = getCatchRecordsV2Vessel(tripRecord.vesselName)
  const tripVesselUser = tripVessel
    ? getCatchRecordsV2VesselUsers(req, tripVessel.reference).find(user => user.userId === tripRecord.userId)
    : null
  const tripVersion = req.query.version || ''
  const selectedVersion = tripVersion === 'original'
    ? tripRecord.originalVersion
    : tripRecord.amendments.find(version => version.key === tripVersion) || tripRecord.amendments[0] || tripRecord.originalVersion
  const hasRetainedWeight = tripRecord.catches.some(catchRecord => {
    let retainedWeight = catchRecord.retained
    if (['original', 'amendment-1', 'amendment-2'].includes(tripVersion) && catchRecord.originalRetained !== undefined) {
      retainedWeight = catchRecord.originalRetained
    }
    return retainedWeight !== undefined && retainedWeight !== null && retainedWeight !== ''
  })

  res.render('catch-records-v2/trip-profile', {
    tripId: tripRecord.id,
    tripRecord,
    tripUserRole: tripVesselUser ? tripVesselUser.role : 'Not linked',
    hasRetainedWeight,
    hasWeightBelowMinimumSize: tripRecord.catches.some(catchRecord => catchRecord.weightBelowMinimumSize !== undefined && catchRecord.weightBelowMinimumSize !== null && catchRecord.weightBelowMinimumSize !== ''),
    hasWeightDiscarded: tripRecord.catches.some(catchRecord => catchRecord.weightDiscarded !== undefined && catchRecord.weightDiscarded !== null && catchRecord.weightDiscarded !== ''),
    gearDisplay: req.query.gearDisplay === 'old' ? 'old' : 'grouped',
    tripLayout: ['a2', 'as-is', 'b', 'b2', 'c', 'd', 'e', 'e2', 'f', 'f2'].includes(req.query.layout) ? req.query.layout : 'a',
    selectedVersion,
    tripVersion,
    tripStatus: req.query.status || selectedVersion.status.toLowerCase()
  })
})

router.get('/catch-records-v2/trip-amendments', function (req, res) {
  const tripRecord = getCatchRecordsTrip(req.query.trip)
  res.render('catch-records-v2/trip-amendments', {
    tripId: tripRecord.id,
    tripRecord
  })
})


// Add your routes here
// Route for displaying the 'Check your answers' page
router.get('/gamma/transport/check-your-answers', function (req, res) {
  const data = req.session.data;
  const groupedTransportTypes = getGroupedTransportTypes(data);
  res.render('gamma/transport/check-your-answers', {
    data,
    groupedTransportTypes
  });
});


// Route for handling transport selection
router.post('/gamma/transport/transport-type', function (req, res) {
  const transportType = req.body['transport-type'];

  if (transportType === 'Truck') {
    res.redirect('/gamma/transport/transport-truck');
  } else if (transportType === 'Plane') {
    res.redirect('/gamma/transport/transport-plane');
  } else if (transportType === 'Train') {
    res.redirect('/gamma/transport/transport-train');
  } else if (transportType === 'Container vessel') {
    res.redirect('/gamma/transport/transport-container-vessel');
  } else {
    res.redirect('/gamma/transport/transport-type');  // Redirect back if no option selected

  }
});

// Route for handling landings option selection
router.post('/gamma/landings-entry', function (req, res) {
  const landingsOption = req.body['landings-option'];

  if (landingsOption === 'dl' || landingsOption === 'manual' || landingsOption === 'upload') {
    req.session.data['landingsOption'] = landingsOption;
    res.redirect('/gamma/progress'); // Always go to the same progress page
  } else {
    res.redirect('/gamma/landings-entry'); // Redirect back if no option selected
  }
});

router.get('/gamma/landings-entry', function (req, res) {
  res.render('gamma/landings-entry', { data: req.session.data });
});

// Conditional redirect based on stored landing option
router.post('/gamma/proceed-landing', function (req, res) {
  const landingsOption = req.session.data['landingsOption'] || 'dl';
  if (landingsOption === 'manual' || landingsOption === 'upload') {
    res.redirect('/gamma/manual-entry');
  } else {
    res.redirect('/gamma/direct-landing');
  }
});



// Route for handling truck transport
router.post('/gamma/transport/transport-truck', function (req, res) {
  req.session.data['truck-nationality'] = req.body['truck-nationality'];
  req.session.data['truck-registration'] = req.body['registration-number'];
  req.session.data['export-place'] = req.body['export-place'];
  req.session.data['destination-point-truck'] = req.body['destination-point-truck'];
  req.session.data['freight-number'] = req.body['freight-number'];
  req.session.data['container-identification-truck'] = req.body['container-identification-truck']; // single value

  // Add to transportTypes array in session
  req.session.data['transportTypes'] = req.session.data['transportTypes'] || [];
  req.session.data['transportTypes'].push({
    type: 'Truck',
    truckNationality: req.body['truck-nationality'],
    truckRegistration: req.body['registration-number'],
    exportPlace: req.body['export-place'],
    destinationPoint: req.body['destination-point-truck'],
    freightBillNumber: req.body['freight-number'],
    containerIdentification: req.body['container-identification-truck']
  });
 
  res.redirect('/gamma/transport/transport-documents');
});

// Route for handling plane transport
router.post('/gamma/transport/transport-plane', function (req, res) {
  req.session.data['airway-bill'] = req.body['airway-bill'];
  req.session.data['flight-number'] = req.body['flight-number'];
  req.session.data['plane-departure'] = req.body['plane-departure'];
  req.session.data['destination-point-plane'] = req.body['destination-point-plane'];
  req.session.data['container-identification'] = req.body['container-identification'];

  req.session.data['transportTypes'] = req.session.data['transportTypes'] || [];
  req.session.data['transportTypes'].push({
    type: 'Plane',
    flightNumber: req.body['flight-number'],
    planeDeparture: req.body['plane-departure'],
    destinationPoint: req.body['destination-point-plane'],
    airwayBill: req.body['airway-bill'],
    containerIdentification: req.body['container-identification']
  });
  res.redirect('/gamma/transport/transport-documents-plane');
});

// Route for handling train transport
router.post('/gamma/transport/transport-train', function (req, res) {
  req.session.data['railway-bill'] = req.body['railway-bill'];
  req.session.data['train-departure'] = req.body['train-departure'];
  req.session.data['destination-point-train'] = req.body['destination-point-train'];
  req.session.data['freight-bill'] = req.body['freight-bill'];
  req.session.data['container-identification-train'] = req.body['container-identification-train']; // single value


  req.session.data['transportTypes'] = req.session.data['transportTypes'] || [];
  req.session.data['transportTypes'].push({
    type: 'Train',
    railwayBill: req.body['railway-bill'],
    trainDeparture: req.body['train-departure'],
    destinationPoint: req.body['destination-point-train'],
    freightBillNumber: req.body['freight-bill'],
    containerIdentification: req.body['container-identification-train']
  });
  res.redirect('/gamma/transport/transport-documents-train');
});

// Route for handling container vessel transport
router.post('/gamma/transport/transport-container-vessel', function (req, res) {
  req.session.data['vessel-name'] = req.body['vessel-name'];
  req.session.data['flag-state'] = req.body['flag-state'];
  req.session.data['container-vessel-departure'] = req.body['container-vessel-departure'];
  req.session.data['destination-point-vessel'] = req.body['destination-point-vessel'];
  req.session.data['freight-bill'] = req.body['freight-bill'];

  req.session.data['transportTypes'] = req.session.data['transportTypes'] || [];
  req.session.data['transportTypes'].push({
    type: 'Container vessel',
    vesselName: req.body['vessel-name'],
    flagState: req.body['flag-state'],
    containerVesselDeparture: req.body['container-vessel-departure'],
    destinationPoint: req.body['destination-point-vessel'],
    freightBillNumber: req.body['freight-bill']
  });
  res.redirect('/gamma/transport/transport-documents-vessel');
});


// TRUCK DOCUMENTS
router.post('/gamma/transport/transport-documents', function (req, res) {
  let documentNames = req.session.data['documentName[]'] || [];
  let referenceNumbers = req.session.data['referenceNumber[]'] || [];

  const names = req.body['documentName[]'] || req.body.documentName;
  const refs = req.body['referenceNumber[]'] || req.body.referenceNumber;
  const editIndex = req.body.editIndex;

  if (editIndex !== undefined && editIndex !== '') {
    documentNames[editIndex] = names;
    referenceNumbers[editIndex] = refs;
  } else {
    if (Array.isArray(names)) {
      documentNames.push(...names);
      referenceNumbers.push(...refs);
    } else {
      documentNames.push(names);
      referenceNumbers.push(refs);
    }
  }

  req.session.data['documentName[]'] = documentNames;
  req.session.data['referenceNumber[]'] = referenceNumbers;

  res.redirect('/gamma/transport/transport-additional');
});

// TRAIN DOCUMENTS
router.post('/gamma/transport/transport-documents-train', function (req, res) {
  let documentNames = req.session.data['trainDocumentName[]'] || [];
  let referenceNumbers = req.session.data['trainReferenceNumber[]'] || [];

  const names = req.body['documentName[]'] || req.body.documentName;
  const refs = req.body['referenceNumber[]'] || req.body.referenceNumber;
  const editIndex = req.body.editIndex;

  if (editIndex !== undefined && editIndex !== '') {
    documentNames[editIndex] = names;
    referenceNumbers[editIndex] = refs;
  } else {
    if (Array.isArray(names)) {
      documentNames.push(...names);
      referenceNumbers.push(...refs);
    } else {
      documentNames.push(names);
      referenceNumbers.push(refs);
    }
  }

  req.session.data['trainDocumentName[]'] = documentNames;
  req.session.data['trainReferenceNumber[]'] = referenceNumbers;

  res.redirect('/gamma/transport/transport-additional');
});

// PLANE DOCUMENTS
router.post('/gamma/transport/transport-documents-plane', function (req, res) {
  let documentNames = req.session.data['planeDocumentName[]'] || [];
  let referenceNumbers = req.session.data['planeReferenceNumber[]'] || [];

  const names = req.body['documentName[]'] || req.body.documentName;
  const refs = req.body['referenceNumber[]'] || req.body.referenceNumber;
  const editIndex = req.body.editIndex;

  if (editIndex !== undefined && editIndex !== '') {
    documentNames[editIndex] = names;
    referenceNumbers[editIndex] = refs;
  } else {
    if (Array.isArray(names)) {
      documentNames.push(...names);
      referenceNumbers.push(...refs);
    } else {
      documentNames.push(names);
      referenceNumbers.push(refs);
    }
  }

  req.session.data['planeDocumentName[]'] = documentNames;
  req.session.data['planeReferenceNumber[]'] = referenceNumbers;

  res.redirect('/gamma/transport/transport-additional');
});

// VESSEL DOCUMENTS
router.post('/gamma/transport/transport-documents-vessel', function (req, res) {
  let documentNames = req.session.data['vesselDocumentName[]'] || [];
  let referenceNumbers = req.session.data['vesselReferenceNumber[]'] || [];

  const names = req.body['documentName[]'] || req.body.documentName;
  const refs = req.body['referenceNumber[]'] || req.body.referenceNumber;
  const editIndex = req.body.editIndex;

  if (editIndex !== undefined && editIndex !== '') {
    documentNames[editIndex] = names;
    referenceNumbers[editIndex] = refs;
  } else {
    if (Array.isArray(names)) {
      documentNames.push(...names);
      referenceNumbers.push(...refs);
    } else {
      documentNames.push(names);
      referenceNumbers.push(refs);
    }
  }

  req.session.data['vesselDocumentName[]'] = documentNames;
  req.session.data['vesselReferenceNumber[]'] = referenceNumbers;

  res.redirect('/gamma/transport/transport-additional');
});





router.post('/gamma/transport/transport-additional', function (req, res) {
  // Handle removal of a transport row
  const removeIndex = req.body.removeIndex;
  if (removeIndex !== undefined && removeIndex !== '') {
    let transportTypes = req.session.data['transportTypes'] || [];
    // Get the type of the transport being removed
    const removed = transportTypes[removeIndex];
    const removedType = removed && removed.type;
    transportTypes.splice(removeIndex, 1);
    req.session.data['transportTypes'] = transportTypes;
    // Only remove from the relevant document/reference arrays for the removed type
    if (removedType === 'Truck') {
      let documentNames = req.session.data['documentName[]'] || [];
      let referenceNumbers = req.session.data['referenceNumber[]'] || [];
      if (documentNames.length > removeIndex) documentNames.splice(removeIndex, 1);
      if (referenceNumbers.length > removeIndex) referenceNumbers.splice(removeIndex, 1);
      req.session.data['documentName[]'] = documentNames;
      req.session.data['referenceNumber[]'] = referenceNumbers;
    } else if (removedType === 'Train') {
      let trainDocumentNames = req.session.data['trainDocumentName[]'] || [];
      let trainReferenceNumbers = req.session.data['trainReferenceNumber[]'] || [];
      if (trainDocumentNames.length > removeIndex) trainDocumentNames.splice(removeIndex, 1);
      if (trainReferenceNumbers.length > removeIndex) trainReferenceNumbers.splice(removeIndex, 1);
      req.session.data['trainDocumentName[]'] = trainDocumentNames;
      req.session.data['trainReferenceNumber[]'] = trainReferenceNumbers;
    } else if (removedType === 'Plane') {
      let planeDocumentNames = req.session.data['planeDocumentName[]'] || [];
      let planeReferenceNumbers = req.session.data['planeReferenceNumber[]'] || [];
      if (planeDocumentNames.length > removeIndex) planeDocumentNames.splice(removeIndex, 1);
      if (planeReferenceNumbers.length > removeIndex) planeReferenceNumbers.splice(removeIndex, 1);
      req.session.data['planeDocumentName[]'] = planeDocumentNames;
      req.session.data['planeReferenceNumber[]'] = planeReferenceNumbers;
    } else if (removedType === 'Container vessel') {
      let vesselDocumentNames = req.session.data['vesselDocumentName[]'] || [];
      let vesselReferenceNumbers = req.session.data['vesselReferenceNumber[]'] || [];
      if (vesselDocumentNames.length > removeIndex) vesselDocumentNames.splice(removeIndex, 1);
      if (vesselReferenceNumbers.length > removeIndex) vesselReferenceNumbers.splice(removeIndex, 1);
      req.session.data['vesselDocumentName[]'] = vesselDocumentNames;
      req.session.data['vesselReferenceNumber[]'] = vesselReferenceNumbers;
    }
    return res.redirect('/gamma/transport/transport-additional');
  }
  let documentNames = req.session.data['documentName[]'] || [];
  let referenceNumbers = req.session.data['referenceNumber[]'] || [];

  const name = req.body['documentName[]'];
  const ref = req.body['referenceNumber[]'];
  const editIndex = req.body.editIndex;

  if (editIndex !== undefined && editIndex !== '') {
    documentNames[editIndex] = name;
    referenceNumbers[editIndex] = ref;
  } else {
    if (Array.isArray(name)) {
      documentNames.push(...name);
      referenceNumbers.push(...ref);
    } else {
      documentNames.push(name);
      referenceNumbers.push(ref);
    }
  }

  // Save the updated document names and reference numbers back to the session

  req.session.data['documentName[]'] = documentNames;
  req.session.data['referenceNumber[]'] = referenceNumbers;
  req.session.data['additional-modes'] = req.body['additional-modes'];

  const additionalModes = req.body['additional-modes'];
  if (additionalModes === 'Yes') {
    res.redirect('/gamma/transport/transport-type');
  } else if (additionalModes === 'No') {
    res.redirect('/gamma/progress-complete');
  } else {
    res.redirect('/gamma/transport/transport-additional');
  }
});

// Route for handling the 'Your reference' page
router.post('/gamma/your-reference', function (req, res) {
  req.session.data['your-reference'] = req.body['your-reference'];
  // Add more fields as needed

  // Redirect based on which button was pressed
  if (req.body._action === 'progress' || req.body['formaction'] === 'progress') {
    res.redirect('/gamma/progress');
  } else {
    res.redirect('/gamma/exporter-details');
  }
});


// Route for exporter details
router.post('/gamma/exporter-details', function (req, res) {
  req.session.data['exporter-name'] = req.body['exporter-name']
  req.session.data['company-name'] = req.body['exporter-name']
  // Add more fields as needed
  res.redirect('/gamma/add-products')
})

// Route for gamma add landing
router.post('/gamma/add-landing', function (req, res) {
  const landings = req.session.data['landings'] || [];
  const species = req.body['species'] || '—';
  const state = req.body['state'] || '—';
  const presentation = req.body['presentation'] || '—';

  landings.push({
    product: species + ', ' + state + ', ' + presentation,
    startDate: req.body['startDate'] || '',
    dateLanded: req.body['dateLanded'] || '',
    catchArea: req.body['faoArea'] || '',
    vessel: req.body['vessel'] || '',
    gearCategory: req.body['gear1'] || '',
    gearType: req.body['gear2'] || '',
    exportWeight: req.body['weight'] || ''
  });
  req.session.data['landings'] = landings;

  // Calculate total export weight from all landings
  const totalWeight = landings.reduce((sum, landing) => sum + (parseFloat(landing.exportWeight) || 0), 0);
  req.session.data['totalWeight'] = totalWeight.toFixed(2);

  // Calculate export weight per product
  const productWeights = {};
  landings.forEach(landing => {
    const key = landing.product;
    productWeights[key] = (productWeights[key] || 0) + (parseFloat(landing.exportWeight) || 0);
  });

  // Update products with their calculated export weights from landings
  const products = req.session.data['products'] || [];
  products.forEach(product => {
    const productKey = (product.species || '—') + ', ' + (product.state || '—') + ', ' + (product.presentation || '—');
    product.exportWeight = productWeights[productKey] ? productWeights[productKey].toFixed(2) : '0.00';
  });
  req.session.data['products'] = products;

  res.redirect('/gamma/manual-entry');
});

// Route for gamma catch-waters (save remaining data and proceed)
router.post('/gamma/catch-waters', function (req, res) {
  res.redirect('/gamma/catch-waters');
});

// Route for adding products
router.post('/gamma/add-products', function (req, res) {
  const products = req.session.data['products'] ?? [];
  const {
    species,
    state,
    presentation,
    'commodity-code': commodityCode
  } = req.body;
  products.push({
    species,
    state,
    presentation,
    commodityCode
  });
  req.session.data['products'] = products;
  res.redirect('/gamma/add-products');
})

// Redirect to the next step or back to add-products page
router.post('/gamma/delete-product/:index', function (req, res) {
  const products = req.session.data['products'] ?? [];
  products.splice(parseInt(req.params.index) - 1, 1);
  req.session.data['products'] = products;
  res.redirect('/gamma/add-products');

})


// Route for adding a product favourite
router.post('/gamma/product-favourites', function (req, res) {
  const favourites = req.session.data['favourites'] ?? [];
  const {
    species,
    state,
    presentation,
    'commodity-code': commodityCode
  } = req.body;

  favourites.push({
    species,
    state,
    presentation,
    commodityCode
  });

  req.session.data['favourites'] = favourites;
  res.redirect('/gamma/product-favourites');
});

// Route for deleting a product favourite by index
router.post('/gamma/delete-favourite/:index', function (req, res) {
  const favourites = req.session.data['favourites'] ?? [];
  favourites.splice(parseInt(req.params.index), 1);
  req.session.data['favourites'] = favourites;
  res.redirect('/gamma/product-favourites');
});

// Route for rendering the product favourites page
router.get('/gamma/product-favourites', function (req, res) {
  res.render('gamma/product-favourites', { data: req.session.data });
});


// Route for displaying the add-landings page
router.get('/gamma/direct-landing', function (req, res) {
  res.render('/gamma/direct-landing', { data: req.session.data });
});

// Route for landing details
router.post('../gamma/direct-landing', function (req, res) {
  const session = req.session.data;

  // Save form fields to session
  session['startDateDay'] = req.body['startDateDay'];
  session['startDateMonth'] = req.body['startDateMonth'];
  session['startDateYear'] = req.body['startDateYear'];

  session['day'] = req.body['dateLandedDay'];
  session['month'] = req.body['dateLandedMonth'];
  session['year'] = req.body['dateLandedYear'];

  session['faoArea'] = req.body['faoArea'];
  session['highSeas'] = req.body['highSeas'];
  session['eez'] = req.body['eez'];
  session['rfmo'] = req.body['rfmo'];
  session['vessel'] = req.body['vessel'];
  session['gear1'] = req.body['gear1'];
  session['gear2'] = req.body['gear2'];


 // Save weights array
session['weights'] = req.body['weights'];

// Calculate total export weight
let totalWeight = 0;
const weights = req.body['weights'];

if (weights) {
  for (const item of Object.values(weights)) {
    const weight = parseFloat(item.exportWeight);
    if (!isNaN(weight)) {
      totalWeight += weight;
    }
  }
}

session['totalWeight'] = totalWeight.toFixed(2);


res.redirect('../gamma/catch-waters');

});


// Route for landing details
router.post('../gamma/manual-entry', function (req, res) {
  const session = req.session.data;

  // Save form fields to session
  session['startDateDay'] = req.body['startDateDay'];
  session['startDateMonth'] = req.body['startDateMonth'];
  session['startDateYear'] = req.body['startDateYear'];

  session['day'] = req.body['dateLandedDay'];
  session['month'] = req.body['dateLandedMonth'];
  session['year'] = req.body['dateLandedYear'];

  session['faoArea'] = req.body['faoArea'];
  session['highSeas'] = req.body['highSeas'];
  session['eez'] = req.body['eez'];
  session['rfmo'] = req.body['rfmo'];
  session['vessel'] = req.body['vessel'];
  session['gear1'] = req.body['gear1'];
  session['gear2'] = req.body['gear2'];

  session['weights'] = req.body['weights']; // This is an array of objects

  // Calculate total weight
  let totalWeight = 0;
  const weights = req.body['weights'];

  if (weights) {
    for (const item of Object.values(weights)) {
      const weight = parseFloat(item.exportWeight);
      if (!isNaN(weight)) {
        totalWeight += weight;
      }
    }
  }

  session['totalWeight'] = totalWeight.toFixed(2);

  // Track landings
  if (!session.landings) {
    session.landings = [];
  }

  // Add new landing to the array
  session.landings.push({
    startDateDay: req.body['startDateDay'],
    startDateMonth: req.body['startDateMonth'],
    startDateYear: req.body['startDateYear'],
    dateLandedDay: req.body['dateLandedDay'],
    dateLandedMonth: req.body['dateLandedMonth'],
    dateLandedYear: req.body['dateLandedYear'],
    faoArea: req.body['faoArea'],
    vessel: req.body['vessel'],
    gear1: req.body['gear1'],
    gear2: req.body['gear2'],
    weights: req.body['weights']
  });

  // Save landing count
  session['landingCount'] = session.landings.length;

  // Redirect to the next step
  res.redirect('../gamma/catch-waters');
});



// Route for export journey


router.post('../gamma/catch-waters', function (req, res) {
  req.session.data['waters'] = req.body['waters']; // This will be an array if multiple checkboxes are selected
  res.redirect('../gamma/export-journey');
});

// Proper absolute path route for gamma catch-waters
router.post('/gamma/catch-waters', function (req, res) {
  req.session.data['waters'] = req.body['waters'];
  res.redirect('/gamma/export-journey');
});

router.post('../gamma/progress', function (req, res) {
  req.session.data['waters'] = req.body['waters'];
  res.redirect('../gamma/progress');
});

router.post('../gamma/export-journey', function (req, res) {
  req.session.data['waters'] = req.body['waters'];
  res.redirect('../gamma/export-journey');
});

// Proper absolute path route for gamma transport-type
router.post('/gamma/transport/transport-type', function (req, res) {
  req.session.data['departure-country'] = req.body['departure-country'];
  req.session.data['destination-country'] = req.body['destination-country'];
  const transportType = req.body['transport-type'];

  if (transportType === 'Truck') {
    res.redirect('/gamma/transport/transport-truck');
  } else if (transportType === 'Plane') {
    res.redirect('/gamma/transport/transport-plane');
  } else if (transportType === 'Train') {
    res.redirect('/gamma/transport/transport-train');
  } else if (transportType === 'Container vessel') {
    res.redirect('/gamma/transport/transport-container-vessel');
  } else {
    res.redirect('/gamma/transport/transport-type');
  }
});

// Route for gamma progress from export-journey
router.post('/gamma/progress', function (req, res) {
  req.session.data['departure-country'] = req.body['departure-country'];
  req.session.data['destination-country'] = req.body['destination-country'];
  res.redirect('/gamma/progress');
});

// Route for plane transport

router.post('../gamma/progress', function (req, res) {
  req.session.data['departure-country'] = req.body['departure-country'];
  req.session.data['destination-country'] = req.body['destination-country'];
  res.redirect('../gamma/progress');
});

router.post('../gamma/transport/transport-type', function (req, res) {
  req.session.data['departure-country'] = req.body['departure-country'];
  req.session.data['destination-country'] = req.body['destination-country'];
  res.redirect('../gamma/transport/transport-type');
});

router.post('../gamma/progress', function (req, res) {
  req.session.data['airway-bill'] = req.body['airway-bill'];
  req.session.data['flight-number'] = req.body['flight-number'];
  req.session.data['plane-departure'] = req.body['plane-departure'];
  req.session.data['container-identification'] = req.body['container-identification']; // single value
  req.session.data['freight-bill'] = req.body['freight-bill'];
  res.redirect('../gamma/progress');
});

router.post('../gamma/transport/transport-documents-plane', function (req, res) {
  req.session.data['airway-bill'] = req.body['airway-bill'];
  req.session.data['flight-number'] = req.body['flight-number'];
  req.session.data['plane-departure'] = req.body['plane-departure'];
  req.session.data['container-identification'] = req.body['container-identification']; // single value
  req.session.data['freight-bill'] = req.body['freight-bill'];
  res.redirect('../gamma/transport/transport-documents-plane');
});

router.post('../gamma/transport/check-your-answers', function (req, res) {
  // You could log, save, or simulate submission here
  console.log('Final submission:', req.session.data);

  // Redirect to a confirmation page
  res.redirect('../gamma/catch-certificate-complete');
});

router.get('../gamma/catch-certificate-complete', function (req, res) {
  res.render('../gamma/catch-certificate-complete');
});

// Add your routes here
// Route for displaying the 'Check your answers' page
router.get('/poc/transport/check-your-answers', function (req, res) {
  const data = req.session.data;
  const groupedTransportTypes = getGroupedTransportTypes(data);
  res.render('poc/transport/check-your-answers', {
    data,
    groupedTransportTypes
  });
});


// Route for handling transport selection
router.post('/poc/transport/transport-type', function (req, res) {
  const transportType = req.body['transport-type'];

  if (transportType === 'Truck') {
    res.redirect('/poc/transport/transport-truck');
  } else if (transportType === 'Plane') {
    res.redirect('/poc/transport/transport-plane');
  } else if (transportType === 'Train') {
    res.redirect('/poc/transport/transport-train');
  } else if (transportType === 'Container vessel') {
    res.redirect('/poc/transport/transport-container-vessel');
  } else {
    res.redirect('/poc/transport/transport-type');  // Redirect back if no option selected

  }
});


// Route for handling truck transport
router.post('/poc/transport/transport-truck', function (req, res) {
  req.session.data['truck-nationality'] = req.body['truck-nationality'];
  req.session.data['truck-registration'] = req.body['registration-number'];
  req.session.data['export-place'] = req.body['export-place'];
  req.session.data['freight-number'] = req.body['freight-number'];

  // Add to transportTypes array in session
  req.session.data['transportTypes'] = req.session.data['transportTypes'] || [];
  req.session.data['transportTypes'].push({
    type: 'Truck',
    truckNationality: req.body['truck-nationality'],
    truckRegistration: req.body['registration-number'],
    exportPlace: req.body['export-place'],
    freightBillNumber: req.body['freight-number']
  });
  res.redirect('/poc/transport/transport-documents');
});

// Route for handling plane transport
router.post('/poc/transport/transport-plane', function (req, res) {
  req.session.data['airway-bill'] = req.body['airway-bill'];
  req.session.data['flight-number'] = req.body['flight-number'];
  req.session.data['plane-departure'] = req.body['plane-departure'];
  req.session.data['container-identification'] = req.body['container-identification'];

  req.session.data['transportTypes'] = req.session.data['transportTypes'] || [];
  req.session.data['transportTypes'].push({
    type: 'Plane',
    flightNumber: req.body['flight-number'],
    planeDeparture: req.body['plane-departure'],
    airwayBill: req.body['airway-bill'],
    containerIdentification: req.body['container-identification']
  });
  res.redirect('/poc/transport/transport-documents-plane');
});

// Route for handling train transport
router.post('/poc/transport/transport-train', function (req, res) {
  req.session.data['railway-bill'] = req.body['railway-bill'];
  req.session.data['train-departure'] = req.body['train-departure'];
  req.session.data['freight-bill'] = req.body['freight-bill'];

  req.session.data['transportTypes'] = req.session.data['transportTypes'] || [];
  req.session.data['transportTypes'].push({
    type: 'Train',
    railwayBill: req.body['railway-bill'],
    trainDeparture: req.body['train-departure'],
    freightBillNumber: req.body['freight-bill']
  });
  res.redirect('/poc/transport/transport-documents-train');
});

// Route for handling container vessel transport
router.post('/poc/transport/transport-container-vessel', function (req, res) {
  req.session.data['vessel-name'] = req.body['vessel-name'];
  req.session.data['flag-state'] = req.body['flag-state'];
  req.session.data['container-vessel-departure'] = req.body['container-vessel-departure'];
  req.session.data['freight-bill'] = req.body['freight-bill'];

  req.session.data['transportTypes'] = req.session.data['transportTypes'] || [];
  req.session.data['transportTypes'].push({
    type: 'Container vessel',
    vesselName: req.body['vessel-name'],
    flagState: req.body['flag-state'],
    containerVesselDeparture: req.body['container-vessel-departure'],
    freightBillNumber: req.body['freight-bill']
  });
  res.redirect('/poc/transport/transport-documents-vessel');
});


router.get('/poc/transport/transport-documents', function (req, res) {
  const editIndex = req.query.edit;
  const removeIndex = req.query.remove;

  let documentNames = req.session.data['documentName[]'] || [];
  let referenceNumbers = req.session.data['referenceNumber[]'] || [];

  // Handle removal
  if (removeIndex !== undefined) {
    documentNames.splice(removeIndex, 1);
    referenceNumbers.splice(removeIndex, 1);
    req.session.data['documentName[]'] = documentNames;
    req.session.data['referenceNumber[]'] = referenceNumbers;
    return res.redirect('/poc/transport/transport-additional');
  }

  // Handle editing
  if (editIndex !== undefined) {
    res.render('poc/transport/transport-documents', {
      data: req.session.data,
      editIndex: editIndex,
      editDocumentName: documentNames[editIndex],
      editReferenceNumber: referenceNumbers[editIndex]
    });
  } else {
    res.render('poc/transport/transport-documents', {
      data: req.session.data
    });
  }
});



router.post('/poc/transport/transport-additional', function (req, res) {
  // Handle removal of a transport row
  const removeIndex = req.body.removeIndex;
  if (removeIndex !== undefined && removeIndex !== '') {
    let transportTypes = req.session.data['transportTypes'] || [];
    // Get the type of the transport being removed
    const removed = transportTypes[removeIndex];
    const removedType = removed && removed.type;
    transportTypes.splice(removeIndex, 1);
    req.session.data['transportTypes'] = transportTypes;
    // Only remove from the relevant document/reference arrays for the removed type
    if (removedType === 'Truck') {
      let documentNames = req.session.data['documentName[]'] || [];
      let referenceNumbers = req.session.data['referenceNumber[]'] || [];
      if (documentNames.length > removeIndex) documentNames.splice(removeIndex, 1);
      if (referenceNumbers.length > removeIndex) referenceNumbers.splice(removeIndex, 1);
      req.session.data['documentName[]'] = documentNames;
      req.session.data['referenceNumber[]'] = referenceNumbers;
    } else if (removedType === 'Train') {
      let trainDocumentNames = req.session.data['trainDocumentName[]'] || [];
      let trainReferenceNumbers = req.session.data['trainReferenceNumber[]'] || [];
      if (trainDocumentNames.length > removeIndex) trainDocumentNames.splice(removeIndex, 1);
      if (trainReferenceNumbers.length > removeIndex) trainReferenceNumbers.splice(removeIndex, 1);
      req.session.data['trainDocumentName[]'] = trainDocumentNames;
      req.session.data['trainReferenceNumber[]'] = trainReferenceNumbers;
    } else if (removedType === 'Plane') {
      let planeDocumentNames = req.session.data['planeDocumentName[]'] || [];
      let planeReferenceNumbers = req.session.data['planeReferenceNumber[]'] || [];
      if (planeDocumentNames.length > removeIndex) planeDocumentNames.splice(removeIndex, 1);
      if (planeReferenceNumbers.length > removeIndex) planeReferenceNumbers.splice(removeIndex, 1);
      req.session.data['planeDocumentName[]'] = planeDocumentNames;
      req.session.data['planeReferenceNumber[]'] = planeReferenceNumbers;
    } else if (removedType === 'Container vessel') {
      let vesselDocumentNames = req.session.data['vesselDocumentName[]'] || [];
      let vesselReferenceNumbers = req.session.data['vesselReferenceNumber[]'] || [];
      if (vesselDocumentNames.length > removeIndex) vesselDocumentNames.splice(removeIndex, 1);
      if (vesselReferenceNumbers.length > removeIndex) vesselReferenceNumbers.splice(removeIndex, 1);
      req.session.data['vesselDocumentName[]'] = vesselDocumentNames;
      req.session.data['vesselReferenceNumber[]'] = vesselReferenceNumbers;
    }
    return res.redirect('/poc/transport/transport-additional');
  }
  let documentNames = req.session.data['documentName[]'] || [];
  let referenceNumbers = req.session.data['referenceNumber[]'] || [];

  const name = req.body['documentName[]'];
  const ref = req.body['referenceNumber[]'];
  const editIndex = req.body.editIndex;

  if (editIndex !== undefined && editIndex !== '') {
    documentNames[editIndex] = name;
    referenceNumbers[editIndex] = ref;
  } else {
    if (Array.isArray(name)) {
      documentNames.push(...name);
      referenceNumbers.push(...ref);
    } else {
      documentNames.push(name);
      referenceNumbers.push(ref);
    }
  }

  req.session.data['documentName[]'] = documentNames;
  req.session.data['referenceNumber[]'] = referenceNumbers;
  req.session.data['additional-modes'] = req.body['additional-modes'];

  const additionalModes = req.body['additional-modes'];
  if (additionalModes === 'Yes') {
    res.redirect('/poc/transport/transport-type');
  } else if (additionalModes === 'No') {
    res.redirect('/poc/progress-complete');
  } else {
    res.redirect('/poc/transport/transport-additional');
  }
});




// Route for exporter details
router.post('../poc/add-products', function (req, res) {
  req.session.data['exporter-name'] = req.body['exporter-name']
  req.session.data['company-name'] = req.body['exporter-name']
  // Add more fields as needed
  res.redirect('../poc/add-products')
})



// Route for landing details
router.post('../poc/add-landings', function (req, res) {
  const session = req.session.data;

  // Save form fields to session
  session['startDateDay'] = req.body['startDateDay'];
  session['startDateMonth'] = req.body['startDateMonth'];
  session['startDateYear'] = req.body['startDateYear'];

  session['day'] = req.body['dateLandedDay'];
  session['month'] = req.body['dateLandedMonth'];
  session['year'] = req.body['dateLandedYear'];

  session['faoArea'] = req.body['faoArea'];
  session['highSeas'] = req.body['highSeas'];
  session['eez'] = req.body['eez'];
  session['rfmo'] = req.body['rfmo'];
  session['vessel'] = req.body['vessel'];
  session['weight'] = req.body['weight'];
  session['gear1'] = req.body['gear1'];
  session['gear2'] = req.body['gear2'];

  // Redirect to the next step
  res.redirect('../poc/catch-waters');
});


// Route for export journey


router.post('../poc/catch-waters', function (req, res) {
  req.session.data['waters'] = req.body['waters']; // This will be an array if multiple checkboxes are selected
  res.redirect('../poc/export-journey');
});

router.post('../poc/progress', function (req, res) {
  req.session.data['waters'] = req.body['waters'];
  res.redirect('../poc/progress');
});

router.post('../poc/export-journey', function (req, res) {
  req.session.data['waters'] = req.body['waters'];
  res.redirect('../poc/export-journey');
});

// Route for plane transport

router.post('../poc/progress', function (req, res) {
  req.session.data['departure-country'] = req.body['departure-country'];
  req.session.data['destination-country'] = req.body['destination-country'];
  res.redirect('../poc/progress');
});

router.post('../poc/transport/transport-type', function (req, res) {
  req.session.data['departure-country'] = req.body['departure-country'];
  req.session.data['destination-country'] = req.body['destination-country'];
  res.redirect('../poc/transport/transport-type');
});

router.post('../poc/progress', function (req, res) {
  req.session.data['airway-bill'] = req.body['airway-bill'];
  req.session.data['flight-number'] = req.body['flight-number'];
  req.session.data['plane-departure'] = req.body['plane-departure'];
  req.session.data['container-identification'] = req.body['container-identification']; // single value
  req.session.data['freight-bill'] = req.body['freight-bill'];
  res.redirect('../poc/progress');
});

router.post('../poc/transport/transport-documents-plane', function (req, res) {
  req.session.data['airway-bill'] = req.body['airway-bill'];
  req.session.data['flight-number'] = req.body['flight-number'];
  req.session.data['plane-departure'] = req.body['plane-departure'];
  req.session.data['container-identification'] = req.body['container-identification']; // single value
  req.session.data['freight-bill'] = req.body['freight-bill'];
  res.redirect('../poc/transport/transport-documents-plane');
});

router.post('../poc/transport/check-your-answers', function (req, res) {
  // You could log, save, or simulate submission here
  console.log('Final submission:', req.session.data);

  // Redirect to a confirmation page
  res.redirect('../poc/catch-certificate-complete');
});

router.get('../poc/catch-certificate-complete', function (req, res) {
  res.render('../poc/catch-certificate-complete');
});

// Helper function to group transport types and attach document arrays
function getGroupedTransportTypes(data) {
  const grouped = {};
  const types = data['transportTypes'] || [];
  types.forEach((t, idx) => {
    // Only attach document arrays to the first entry of each type
    const isFirstOfType = idx === types.findIndex(e => e.type === t.type);
    const entry = { ...t, _originalIndex: idx };
    if (isFirstOfType) {
      if (t.type === 'Truck') {
        entry.documentName = data['documentName[]'] || [];
        entry.referenceNumber = data['referenceNumber[]'] || [];
      } else if (t.type === 'Train') {
        entry.documentName = data['trainDocumentName[]'] || [];
        entry.referenceNumber = data['trainReferenceNumber[]'] || [];
      } else if (t.type === 'Plane') {
        entry.documentName = data['planeDocumentName[]'] || [];
        entry.referenceNumber = data['planeReferenceNumber[]'] || [];
      } else if (t.type === 'Container vessel') {
        entry.documentName = data['vesselDocumentName[]'] || [];
        entry.referenceNumber = data['vesselReferenceNumber[]'] || [];
      }
    } else {
      entry.documentName = [];
      entry.referenceNumber = [];
    }
    if (!grouped[t.type]) grouped[t.type] = [];
    grouped[t.type].push(entry);
  });
  // Remove duplicate document/reference display: only keep docs/refs on first entry of each type
  Object.keys(grouped).forEach(type => {
    grouped[type].forEach((entry, i) => {
      if (i > 0) {
        entry.documentName = [];
        entry.referenceNumber = [];
      }
    });
  });
  return grouped;
}

// Update GET for check-your-answers
router.get('/gamma/transport/check-your-answers', function (req, res) {
  const data = req.session.data;
  const groupedTransportTypes = getGroupedTransportTypes(data);
  res.render('gamma/transport/check-your-answers', {
    data,
    groupedTransportTypes
  });
});

// Update GET for transport-additional
router.get('/gamma/transport/transport-additional', function (req, res) {
  const data = req.session.data;
  const groupedTransportTypes = getGroupedTransportTypes(data);
  res.render('gamma/transport/transport-additional', {
    data,
    groupedTransportTypes
  });
});

//Routes for non-manipulation document (nmd)

// Route for handling the 'Your reference' page
router.post('/gamma/nmd/your-reference', function (req, res) {
  req.session.data['your-reference'] = req.body['your-reference'];
  // Add more fields as needed

  // Redirect based on which button was pressed
  if (req.body._action === 'progress' || req.body['formaction'] === 'progress') {
    res.redirect('/gamma/nmd/progress');
  } else {
    res.redirect('/gamma/nmd/exporter-details');
  }
});

// Route for exporter details
router.post('/gamma/nmd/exporter-details', function (req, res) {
  req.session.data['company-name'] = req.body['company-name']
  // Add more fields as needed
  res.redirect('/gamma/nmd/uk-document')
})

// Route for uk document details
router.post('/gamma/nmd/uk-document', function (req, res) {
  req.session.data['uk-document'] = req.body['uk-document'];

  const issuedInUK = req.body['uk-document'];

  if (issuedInUK === 'Yes') {
    res.redirect('/gamma/nmd/confirm-uk-document');
  } else if (issuedInUK === 'No') {
    res.redirect('/gamma/nmd/confirm-uk-document-2');
  } else {
    res.redirect('/gamma/nmd/uk-document'); // fallback if nothing selected
  }
});


// Route for uk document confirmation
router.post('/gamma/nmd/confirm-uk-document', function (req, res) {
  req.session.data['entry-document-reference'] = req.body['entry-document-reference']
  // Add more fields as needed
  res.redirect('/gamma/nmd/product-details')
});

// Route for uk document confirmation for third country
router.post('/gamma/nmd/confirm-uk-document-2', function (req, res) {
  req.session.data['entry-document-reference-2'] = req.body['entry-document-reference-2']
  // Add more fields as needed
  res.redirect('/gamma/nmd/product-details')
});


// Route for product details
router.post('/gamma/nmd/product-details', function (req, res) {
const newEntry = {
  species: req.body['species'],
  commodityCode: req.body['commodity-code'],
  description: req.body['description'],
  referenceNumber: req.session.data['entry-document-reference'], // ✅ copy from top-level
  productReferenceNumber: req.body['productReferenceNumber'],
  netWeight: req.body['net-weight'],
  fishWeight: req.body['fish-weight']
};


  if (!req.session.data['productEntries']) {
    req.session.data['productEntries'] = [];
  }

  const editIndex = req.session.data['editIndex'];

  if (typeof editIndex !== 'undefined') {
    req.session.data['productEntries'][editIndex] = newEntry;
    delete req.session.data['editIndex'];
  } else {
    req.session.data['productEntries'].push(newEntry);
  }

  // Clear fields
  req.session.data['species'] = '';
  req.session.data['commodity-code'] = '';
  req.session.data['description'] = '';
  req.session.data['productReferenceNumber'] = '';
  req.session.data['net-weight'] = '';
  req.session.data['fish-weight'] = '';

  res.redirect('/gamma/nmd/product-summary');
});



// Route for product summary
router.post('/gamma/nmd/product-summary', function (req, res) {


  // Clear single-entry fields
  req.session.data['species'] = '';
  req.session.data['commodity-code'] = '';
  req.session.data['description'] = '';
  req.session.data['productReferenceNumber'] = '';
  req.session.data['net-weight'] = '';
  req.session.data['fish-weight'] = '';

  req.session.data['more-products'] = req.body['more-products'];

  const productEntries = req.body['more-products'];

  if (productEntries === 'Yes') {
    res.redirect('/gamma/nmd/uk-document');
  } else if (productEntries === 'No') {
    res.redirect('/gamma/nmd/transport-type');
  } else {
    // ✅ Render the summary page directly if no selection
    res.render('product-summary', {
      data: {
        productEntries: req.session.data['productEntries']
      }
    });
  }
});

router.get('/gamma/nmd/remove-product/:index', function (req, res) {
  const index = parseInt(req.params.index);
  if (!isNaN(index) && req.session.data['productEntries']) {
    req.session.data['productEntries'].splice(index, 1);
  }
  res.redirect('/gamma/nmd/product-summary');
});


router.get('/gamma/nmd/edit-product/:index', function (req, res) {
  const index = parseInt(req.params.index);
  const product = req.session.data['productEntries'][index];

  // Pre-fill session fields with selected product
  req.session.data['species'] = product.species;
  req.session.data['commodity-code'] = product.commodityCode;
  req.session.data['description'] = product.description;
  req.session.data['entry-document-reference'] = product.referenceNumber;
  req.session.data['productReferenceNumber'] = product.productReferenceNumber;
  req.session.data['net-weight'] = product.netWeight;
  req.session.data['fish-weight'] = product.fishWeight;

  // Store index for update later
  req.session.data['editIndex'] = index;

  res.redirect('/gamma/nmd/product-details');
});



// Route for handling transport selection
router.post('/gamma/nmd/transport-type', function (req, res) {
  const transportType = req.body['transport-type'];

  if (transportType === 'Truck') {
    res.redirect('/gamma/nmd/transport-truck');
  } else if (transportType === 'Plane') {
    res.redirect('/gamma/nmd/transport-plane');
  } else if (transportType === 'Train') {
    res.redirect('/gamma/nmd/transport-train');
  } else if (transportType === 'Container vessel') {
    res.redirect('/gamma/nmd/transport-container-vessel');
  } else {
    res.redirect('/gamma/nmd/transport-type');  // Redirect back if no option selected

  }
});

// Route for handling truck transport
router.post('/gamma/nmd/transport-truck', function (req, res) {
  req.session.data['truck-nationality'] = req.body['truck-nationality'];
  req.session.data['truck-registration'] = req.body['registration-number'];
  req.session.data['export-place'] = req.body['export-place'];
  req.session.data['freight-number'] = req.body['freight-number'];

  // Add to transportTypes array in session
  req.session.data['transportTypes'] = req.session.data['transportTypes'] || [];
  req.session.data['transportTypes'].push({
    type: 'Truck',
    truckNationality: req.body['truck-nationality'],
    truckRegistration: req.body['registration-number'],
    exportPlace: req.body['export-place'],
    freightBillNumber: req.body['freight-number']
  });
  res.redirect('/gamma/nmd/transport-documents');
});

// Route for handling plane transport
router.post('/gamma/nmd/transport-plane', function (req, res) {
  req.session.data['airway-bill'] = req.body['airway-bill'];
  req.session.data['flight-number'] = req.body['flight-number'];
  req.session.data['plane-departure'] = req.body['plane-departure'];
  req.session.data['container-identification'] = req.body['container-identification'];

  req.session.data['transportTypes'] = req.session.data['transportTypes'] || [];
  req.session.data['transportTypes'].push({
    type: 'Plane',
    flightNumber: req.body['flight-number'],
    planeDeparture: req.body['plane-departure'],
    airwayBill: req.body['airway-bill'],
    containerIdentification: req.body['container-identification']
  });
  res.redirect('/gamma/nmd/transport-documents-plane');
});

// Route for handling train transport
router.post('/gamma/nmd/transport-train', function (req, res) {
  req.session.data['railway-bill'] = req.body['railway-bill'];
  req.session.data['train-departure'] = req.body['train-departure'];
  req.session.data['freight-bill'] = req.body['freight-bill'];

  req.session.data['transportTypes'] = req.session.data['transportTypes'] || [];
  req.session.data['transportTypes'].push({
    type: 'Train',
    railwayBill: req.body['railway-bill'],
    trainDeparture: req.body['train-departure'],
    freightBillNumber: req.body['freight-bill']
  });
  res.redirect('/gamma/nmd/transport-documents-train');
});

// Route for handling container vessel transport
router.post('/gamma/nmd/transport-container-vessel', function (req, res) {
  req.session.data['vessel-name'] = req.body['vessel-name'];
  req.session.data['flag-state'] = req.body['flag-state'];
  req.session.data['container-vessel-departure'] = req.body['container-vessel-departure'];
  req.session.data['freight-bill'] = req.body['freight-bill'];

  req.session.data['transportTypes'] = req.session.data['transportTypes'] || [];
  req.session.data['transportTypes'].push({
    type: 'Container vessel',
    vesselName: req.body['vessel-name'],
    flagState: req.body['flag-state'],
    containerVesselDeparture: req.body['container-vessel-departure'],
    freightBillNumber: req.body['freight-bill']
  });
  res.redirect('/gamma/nmd/transport-documents-vessel');
});


// TRUCK DOCUMENTS
router.post('/gamma/nmd/transport-documents', function (req, res) {
  let documentNames = req.session.data['documentName[]'] || [];
  let referenceNumbers = req.session.data['referenceNumber[]'] || [];

  const names = req.body['documentName[]'] || req.body.documentName;
  const refs = req.body['referenceNumber[]'] || req.body.referenceNumber;
  const editIndex = req.body.editIndex;

  if (editIndex !== undefined && editIndex !== '') {
    documentNames[editIndex] = names;
    referenceNumbers[editIndex] = refs;
  } else {
    if (Array.isArray(names)) {
      documentNames.push(...names);
      referenceNumbers.push(...refs);
    } else {
      documentNames.push(names);
      referenceNumbers.push(refs);
    }
  }

  req.session.data['documentName[]'] = documentNames;
  req.session.data['referenceNumber[]'] = referenceNumbers;

  res.redirect('/gamma/nmd/arrival-details');
});

// TRAIN DOCUMENTS
router.post('/gamma/nmd/transport-documents-train', function (req, res) {
  let documentNames = req.session.data['trainDocumentName[]'] || [];
  let referenceNumbers = req.session.data['trainReferenceNumber[]'] || [];

  const names = req.body['documentName[]'] || req.body.documentName;
  const refs = req.body['referenceNumber[]'] || req.body.referenceNumber;
  const editIndex = req.body.editIndex;

  if (editIndex !== undefined && editIndex !== '') {
    documentNames[editIndex] = names;
    referenceNumbers[editIndex] = refs;
  } else {
    if (Array.isArray(names)) {
      documentNames.push(...names);
      referenceNumbers.push(...refs);
    } else {
      documentNames.push(names);
      referenceNumbers.push(refs);
    }
  }

  req.session.data['trainDocumentName[]'] = documentNames;
  req.session.data['trainReferenceNumber[]'] = referenceNumbers;

  res.redirect('/gamma/nmd/arrival-details');
});

// PLANE DOCUMENTS
router.post('/gamma/nmd/transport-documents-plane', function (req, res) {
  let documentNames = req.session.data['planeDocumentName[]'] || [];
  let referenceNumbers = req.session.data['planeReferenceNumber[]'] || [];

  const names = req.body['documentName[]'] || req.body.documentName;
  const refs = req.body['referenceNumber[]'] || req.body.referenceNumber;
  const editIndex = req.body.editIndex;

  if (editIndex !== undefined && editIndex !== '') {
    documentNames[editIndex] = names;
    referenceNumbers[editIndex] = refs;
  } else {
    if (Array.isArray(names)) {
      documentNames.push(...names);
      referenceNumbers.push(...refs);
    } else {
      documentNames.push(names);
      referenceNumbers.push(refs);
    }
  }

  req.session.data['planeDocumentName[]'] = documentNames;
  req.session.data['planeReferenceNumber[]'] = referenceNumbers;

  res.redirect('/gamma/nmd/arrival-details');
});

// VESSEL DOCUMENTS
router.post('/gamma/nmd/transport-documents-vessel', function (req, res) {
  let documentNames = req.session.data['vesselDocumentName[]'] || [];
  let referenceNumbers = req.session.data['vesselReferenceNumber[]'] || [];

  const names = req.body['documentName[]'] || req.body.documentName;
  const refs = req.body['referenceNumber[]'] || req.body.referenceNumber;
  const editIndex = req.body.editIndex;

  if (editIndex !== undefined && editIndex !== '') {
    documentNames[editIndex] = names;
    referenceNumbers[editIndex] = refs;
  } else {
    if (Array.isArray(names)) {
      documentNames.push(...names);
      referenceNumbers.push(...refs);
    } else {
      documentNames.push(names);
      referenceNumbers.push(refs);
    }
  }

  req.session.data['vesselDocumentName[]'] = documentNames;
  req.session.data['vesselReferenceNumber[]'] = referenceNumbers;

  res.redirect('/gamma/nmd/arrival-details');
});

// Route for handling the storage facility arrival page
router.post('/gamma/nmd/arrival-details', function (req, res) {
  req.session.data['departure-country'] = req.body['departure-country'];
    req.session.data['departure-location'] = req.body['departure-location'];
      req.session.data['storage-location'] = req.body['storage-location'];

      // Combine departure date
const departureDay = req.body['departure-date-day'];
const departureMonth = req.body['departure-date-month'];
const departureYear = req.body['departure-date-year'];
req.session.data['departure-date'] = `${departureDay}/${departureMonth}/${departureYear}`;

// Combine arrival date
const arrivalDay = req.body['arrival-date-day'];
const arrivalMonth = req.body['arrival-date-month']; // fix typo in HTML
const arrivalYear = req.body['arrival-date-year'];
req.session.data['arrival-date'] = `${arrivalDay}/${arrivalMonth}/${arrivalYear}`;

  // Add more fields as needed

  // Redirect based on which button was pressed
  if (req.body._action === 'progress' || req.body['formaction'] === 'progress') {
    res.redirect('/gamma/nmd/progress');
  } else {
    res.redirect('/gamma/nmd/storage-facility-details');
  }
});

// Route for storage facility details
router.post('/gamma/nmd/storage-facility-details', function (req, res) {
  req.session.data['facility-name'] = req.body['facility-name'];
  // Add more fields as needed
  res.redirect('/gamma/nmd/storage-facility-address');
});

// Route for storage facility details
router.post('/gamma/nmd/storage-facility-address', function (req, res) {
  req.session.data['postcode'] = req.body['postcode'];
  // Add more fields as needed
  res.redirect('/gamma/nmd/storage-facility-address-2');
});

// Route for storage facility address
router.post('/gamma/nmd/storage-facility-address-2', function (req, res) {
  req.session.data['building-number'] = req.body['building-number'];
  req.session.data['building-name'] = req.body['building-name'];
  req.session.data['sub-building-name'] = req.body['sub-building-name'];
  req.session.data['street-name'] = req.body['street-name'];
  req.session.data['county'] = req.body['county'];
  req.session.data['country'] = req.body['country'];
  // Add more fields as needed
  res.redirect('/gamma/nmd/storage-facility-confirmation');
});

// Route for storage facility confirmation
router.post('/gamma/nmd/storage-facility-confirmation', function (req, res) {
  
  // Add more fields as needed
  res.redirect('/gamma/nmd/storage-facility-approval');
});


// Route for storage facility approval
// Route for storage facility approval
router.post('/gamma/nmd/storage-facility-approval', function (req, res) {
  let storageTypes = [].concat(req.body['product-storage'] || []);
  storageTypes = storageTypes.filter(item => item !== '_unchecked');
  req.session.data['product-storage'] = storageTypes;
  res.redirect('/gamma/nmd/storage-facility-summary');
});



// Route for storage facility summary
router.post('/gamma/nmd/storage-facility-summary', function (req, res) {
  // Get current values from session
  const facilityName = req.session.data['facility-name'];
  const addAnother = req.body['storage-facility']; // Yes or No

  // Create a new facility entry
  const newFacility = {
    name: facilityName,
  };

  // Save to session array
  if (!req.session.data['storageFacilities']) {
    req.session.data['storageFacilities'] = [];
  }

  req.session.data['storageFacilities'].push(newFacility);

  // Redirect based on user choice
  if (addAnother === 'Yes') {
    res.redirect('/gamma/nmd/storage-facility-details');
  } else if (addAnother === 'No') {
    res.redirect('/gamma/nmd/departure-summary');
  } else {
    res.redirect('/gamma/nmd/storage-facility-summary');
  }
});

// Route for departure details
router.post('/gamma/nmd/departure-details', function (req, res) {
  // Capture date parts
  const day = req.body['departure-date-uk-day'];
  const month = req.body['departure-date-uk-month'];
  const year = req.body['departure-date-uk-year'];

  // Combine into a single date string (optional formatting)
  const departureDate = `${day}/${month}/${year}`;
  req.session.data['departure-date-uk'] = departureDate;

  // Capture departure location
  req.session.data['departure-location-uk'] = req.body['departure-location-uk'];

  // Redirect to the next step
  res.redirect('/gamma/nmd/departure-destination');
});


// Route for departure summary
router.post('/gamma/nmd/departure-summary', function (req, res) {
  const productEntries = req.session.data['productEntries'];

  if (productEntries && Array.isArray(productEntries)) {
    productEntries.forEach((entry, index) => {
      const netWeightKey = `departure-net-weight-${index}`;
      const fishWeightKey = `departure-fish-weight-${index}`;

      entry.departureNetWeight = req.body[netWeightKey];
      entry.departureFishWeight = req.body[fishWeightKey];
    });
  }

  res.redirect('/gamma/nmd/departure-details');
});


// Route for consignment destination
router.post('/gamma/nmd/departure-destination', function (req, res) {
  // Capture the destination country
  const destinationCountry = req.body['departure-destination-country'];

  // Save to session
  req.session.data['departure-destination-country'] = destinationCountry;

  // Redirect to the next step in the journey
  res.redirect('/gamma/nmd/departure-transport-type');
});

router.post('/gamma/nmd/departure-transport-type', function (req, res) {
  const transportType = req.body['departure-transport-type'];

  if (transportType === 'Truck') {
    res.redirect('/gamma/nmd/departure-transport-truck');
  } else if (transportType === 'Plane') {
    res.redirect('/gamma/nmd/departure-transport-plane');
  } else if (transportType === 'Train') {
    res.redirect('/gamma/nmd/departure-transport-train');
  } else if (transportType === 'Container vessel') {
    res.redirect('/gamma/nmd/departure-transport-container-vessel');
  } else {
    res.redirect('/gamma/nmd/departure-transport-type');
  }
});

router.post('/gamma/nmd/departure-transport-truck', function (req, res) {
  req.session.data['departure-truck-nationality'] = req.body['truck-nationality'];
  req.session.data['departure-truck-registration'] = req.body['registration-number'];
  req.session.data['departure-export-place'] = req.body['export-place'];
  req.session.data['departure-freight-number'] = req.body['freight-number'];

  res.redirect('/gamma/nmd/departure-transport-documents');
});

router.post('/gamma/nmd/departure-transport-plane', function (req, res) {
  req.session.data['departure-airway-bill'] = req.body['airway-bill'];
  req.session.data['departure-flight-number'] = req.body['flight-number'];
  req.session.data['departure-plane-departure'] = req.body['plane-departure'];
  req.session.data['departure-container-identification'] = req.body['container-identification'];

  res.redirect('/gamma/nmd/departure-transport-documents-plane');
});

router.post('/gamma/nmd/departure-transport-train', function (req, res) {
  req.session.data['departure-railway-bill'] = req.body['railway-bill'];
  req.session.data['departure-train-departure'] = req.body['train-departure'];
  req.session.data['departure-freight-bill'] = req.body['freight-bill'];

  res.redirect('/gamma/nmd/departure-transport-documents-train');
});

router.post('/gamma/nmd/departure-transport-container-vessel', function (req, res) {
  req.session.data['departure-vessel-name'] = req.body['vessel-name'];
  req.session.data['departure-flag-state'] = req.body['flag-state'];
  req.session.data['departure-container-vessel-departure'] = req.body['container-vessel-departure'];
  req.session.data['departure-freight-bill'] = req.body['departure-freight-bill'];

  res.redirect('/gamma/nmd/departure-transport-documents-vessel');
});

router.post('/gamma/nmd/departure-transport-documents', function (req, res) {
  let documentNames = req.session.data['departure-documentName[]'] || [];
  let referenceNumbers = req.session.data['departure-referenceNumber[]'] || [];

  const names = req.body['documentName[]'] || req.body.documentName;
  const refs = req.body['referenceNumber[]'] || req.body.referenceNumber;
  const editIndex = req.body.editIndex;

  if (editIndex !== undefined && editIndex !== '') {
    documentNames[editIndex] = names;
    referenceNumbers[editIndex] = refs;
  } else {
    if (Array.isArray(names)) {
      documentNames.push(...names);
      referenceNumbers.push(...refs);
    } else {
      documentNames.push(names);
      referenceNumbers.push(refs);
    }
  }

  req.session.data['departure-documentName[]'] = documentNames;
  req.session.data['departure-referenceNumber[]'] = referenceNumbers;

  res.redirect('/gamma/nmd/progress');
});

router.post('/gamma/nmd/departure-transport-documents-plane', function (req, res) {
  let documentNames = req.session.data['departure-planeDocumentName[]'] || [];
  let referenceNumbers = req.session.data['departure-planeReferenceNumber[]'] || [];

  const names = req.body['documentName[]'] || req.body.documentName;
  const refs = req.body['referenceNumber[]'] || req.body.referenceNumber;
  const editIndex = req.body.editIndex;

  if (editIndex !== undefined && editIndex !== '') {
    documentNames[editIndex] = names;
    referenceNumbers[editIndex] = refs;
  } else {
    if (Array.isArray(names)) {
      documentNames.push(...names);
      referenceNumbers.push(...refs);
    } else {
      documentNames.push(names);
      referenceNumbers.push(refs);
    }
  }

  req.session.data['departure-planeDocumentName[]'] = documentNames;
  req.session.data['departure-planeReferenceNumber[]'] = referenceNumbers;

  res.redirect('/gamma/nmd/progress');
});

router.post('/gamma/nmd/departure-transport-documents-train', function (req, res) {
  let documentNames = req.session.data['departure-trainDocumentName[]'] || [];
  let referenceNumbers = req.session.data['departure-trainReferenceNumber[]'] || [];

  const names = req.body['documentName[]'] || req.body.documentName;
  const refs = req.body['referenceNumber[]'] || req.body.referenceNumber;
  const editIndex = req.body.editIndex;

  if (editIndex !== undefined && editIndex !== '') {
    documentNames[editIndex] = names;
    referenceNumbers[editIndex] = refs;
  } else {
    if (Array.isArray(names)) {
      documentNames.push(...names);
      referenceNumbers.push(...refs);
    } else {
      documentNames.push(names);
      referenceNumbers.push(refs);
    }
  }

  req.session.data['departure-trainDocumentName[]'] = documentNames;
  req.session.data['departure-trainReferenceNumber[]'] = referenceNumbers;

  res.redirect('/gamma/nmd/progress');
});

router.post('/gamma/nmd/departure-transport-documents-vessel', function (req, res) {
  let documentNames = req.session.data['departure-vesselDocumentName[]'] || [];
  let referenceNumbers = req.session.data['departure-vesselReferenceNumber[]'] || [];

  const names = req.body['documentName[]'] || req.body.documentName;
  const refs = req.body['referenceNumber[]'] || req.body.referenceNumber;
  const editIndex = req.body.editIndex;

  if (editIndex !== undefined && editIndex !== '') {
    documentNames[editIndex] = names;
    referenceNumbers[editIndex] = refs;
  } else {
    if (Array.isArray(names)) {
      documentNames.push(...names);
      referenceNumbers.push(...refs);
    } else {
      documentNames.push(names);
      referenceNumbers.push(refs);
    }
  }

  req.session.data['departure-vesselDocumentName[]'] = documentNames;
  req.session.data['departure-vesselReferenceNumber[]'] = referenceNumbers;

  res.redirect('/gamma/nmd/progress');
});


router.get('/gamma/nmd/progress', function (req, res) {
  res.render('gamma/nmd/progress.html', {
    data: req.session.data
  });
});
router.post('/gamma/nmd/progress', function (req, res) {
  // Handle the progress form submission
  const action = req.body._action || req.body.formaction;

  if (action === 'progress') {
    // Redirect to the next step in the journey
    res.redirect('/gamma/nmd/check-your-answers');
  } else {
    // Redirect to the previous step or stay on the same page
    res.redirect('/gamma/nmd/progress');
  }
});


// Route for handling the 'Your reference' page
router.post('/gamma/sd/your-reference', function (req, res) {
  req.session.data['your-reference'] = req.body['your-reference'];
  // Add more fields as needed

  // Redirect based on which button was pressed
  if (req.body._action === 'progress' || req.body['formaction'] === 'progress') {
    res.redirect('/gamma/sd/progress');
  } else {
    res.redirect('/gamma/sd/exporter-details');
  }
});

// Route for exporter details
router.post('/gamma/sd/exporter-details', function (req, res) {
  req.session.data['company-name'] = req.body['company-name']
  // Add more fields as needed
  res.redirect('/gamma/sd/product-details')
})

// Route for product details
router.post('/gamma/sd/product-details', function (req, res) {
  const newEntry = {
    ukDocument: req.body['uk-document'], // now collected here
    issuingCountry: req.body['issuing-country'], // <-- add this line
    entryDocumentReference: req.body['entry-document-reference'], // now collected here
    entryWeight: req.body['entry-weight'], // <-- add this line
    species: req.body['species'],
    commodityCode: req.body['commodity-code'],
    description: req.body['description'],
    productReferenceNumber: req.body['productReferenceNumber'],
    netWeight: req.body['net-weight'],
    fishWeight: req.body['fish-weight']
  };

  if (!req.session.data['productEntries']) {
    req.session.data['productEntries'] = [];
  }

  const editIndex = req.session.data['editIndex'];

  if (typeof editIndex !== 'undefined') {
    req.session.data['productEntries'][editIndex] = newEntry;
    delete req.session.data['editIndex'];
  } else {
    req.session.data['productEntries'].push(newEntry);
  }

  // Clear fields
  req.session.data['uk-document'] = '';
  req.session.data['issuing-country'] = '';
  req.session.data['entry-document-reference'] = '';
  req.session.data['entry-weight'] = '';
  req.session.data['species'] = '';
  req.session.data['commodity-code'] = '';
  req.session.data['description'] = '';
  req.session.data['productReferenceNumber'] = '';
  req.session.data['net-weight'] = '';
  req.session.data['fish-weight'] = '';

  res.redirect('/gamma/sd/product-summary');
});




// Route for product summary
router.post('/gamma/sd/product-summary', function (req, res) {
  // Clear single-entry fields
  req.session.data['uk-document'] = '';
  req.session.data['entry-document-reference'] = '';
  req.session.data['productReferenceNumber'] = '';
  req.session.data['species'] = '';
  req.session.data['commodity-code'] = '';
  req.session.data['description'] = '';
  req.session.data['net-weight'] = '';
  req.session.data['fish-weight'] = '';

  req.session.data['more-products'] = req.body['more-products'];

  const productEntries = req.body['more-products'];

  if (productEntries === 'Yes') {
    res.redirect('/gamma/sd/product-details'); // ✅ stays in SD flow
  } else if (productEntries === 'No') {
    res.redirect('/gamma/sd/transport-type');
  } else {
    // ✅ Render the correct SD summary template in this journey
    res.render('gamma/sd/product-summary.html', {
      data: {
        productEntries: req.session.data['productEntries']
      }
    });
  }
});

router.get('/gamma/sd/edit-product/:index', function (req, res) {
  const index = parseInt(req.params.index);
  const product = req.session.data['productEntries'][index];

  // Pre-fill session fields with selected product
  req.session.data['uk-document'] = product.ukDocument;
  req.session.data['entry-document-reference'] = product.entryDocumentReference;
  req.session.data['productReferenceNumber'] = product.productReferenceNumber;
  req.session.data['species'] = product.species;
  req.session.data['commodity-code'] = product.commodityCode;
  req.session.data['description'] = product.description;
  req.session.data['net-weight'] = product.netWeight;
  req.session.data['fish-weight'] = product.fishWeight;

  // Store index for update later
  req.session.data['editIndex'] = index;

  res.redirect('/gamma/sd/product-details');
});


router.get('/gamma/sd/remove-product/:index', function (req, res) {
  const index = parseInt(req.params.index);
  if (!isNaN(index) && req.session.data['productEntries']) {
    req.session.data['productEntries'].splice(index, 1);
  }
  res.redirect('/gamma/sd/product-summary');
});



// Route for handling transport selection
router.post('/gamma/sd/transport-type', function (req, res) {
  const transportType = req.body['transport-type'];

  if (transportType === 'Truck') {
    res.redirect('/gamma/sd/transport-truck');
  } else if (transportType === 'Plane') {
    res.redirect('/gamma/sd/transport-plane');
  } else if (transportType === 'Train') {
    res.redirect('/gamma/sd/transport-train');
  } else if (transportType === 'Container vessel') {
    res.redirect('/gamma/sd/transport-container-vessel');
  } else {
    res.redirect('/gamma/sd/transport-type');  // Redirect back if no option selected

  }
});

// Route for handling truck transport
router.post('/gamma/sd/transport-truck', function (req, res) {
  req.session.data['departure-country'] = req.body['departure-country'];
  req.session.data['truck-nationality'] = req.body['truck-nationality'];
  req.session.data['truck-registration'] = req.body['registration-number'];
  req.session.data['export-place'] = req.body['export-place'];
  req.session.data['unloading-place'] = req.body['unloading-place'];
  req.session.data['freight-number'] = req.body['freight-number'];

        // Combine departure date
const departureDay = req.body['departure-date-day'];
const departureMonth = req.body['departure-date-month'];
const departureYear = req.body['departure-date-year'];
req.session.data['departure-date'] = `${departureDay}/${departureMonth}/${departureYear}`;

  // Add to transportTypes array in session
  req.session.data['transportTypes'] = req.session.data['transportTypes'] || [];
  req.session.data['transportTypes'].push({
    type: 'Truck',
    departureCountry: req.body['departure-country'],
    truckNationality: req.body['truck-nationality'],
    truckRegistration: req.body['registration-number'],
    exportPlace: req.body['export-place'],
    unloadingPlace: req.body['unloading-place'],
    freightBillNumber: req.body['freight-number'],
    departureDate: req.session.data['departure-date']
  });
  res.redirect('/gamma/sd/transport-documents');
});

// Route for handling plane transport
router.post('/gamma/sd/transport-plane', function (req, res) {
  req.session.data['plane-departure-country'] = req.body['plane-departure-country'];
  req.session.data['unloading-place-plane'] = req.body['unloading-place-plane'];
  req.session.data['airway-bill'] = req.body['airway-bill'];
  req.session.data['flight-number'] = req.body['flight-number'];
  req.session.data['plane-departure'] = req.body['plane-departure'];
  req.session.data['container-identification'] = req.body['container-identification'];

          // Combine plane departure date
  const departureDay = req.body['plane-departure-date-day'];
  const departureMonth = req.body['plane-departure-date-month'];
  const departureYear = req.body['plane-departure-date-year'];
  req.session.data['plane-departure-date'] = `${departureDay}/${departureMonth}/${departureYear}`;

  req.session.data['transportTypes'] = req.session.data['transportTypes'] || [];
  req.session.data['transportTypes'].push({
    type: 'Plane',
    planeDepartureCountry: req.body['plane-departure-country'],
    flightNumber: req.body['flight-number'],
    planeDeparture: req.body['plane-departure'],
    airwayBill: req.body['airway-bill'],
    unloadingPlacePlane: req.body['unloading-place-plane'],
    containerIdentification: req.body['container-identification'],
    planeDepartureDate: req.session.data['plane-departure-date']
  });
  res.redirect('/gamma/sd/transport-documents-plane');
});

// Route for handling train transport
router.post('/gamma/sd/transport-train', function (req, res) {
  req.session.data['train-departure-country'] = req.body['train-departure-country'];
  req.session.data['railway-bill'] = req.body['railway-bill'];
  req.session.data['train-departure'] = req.body['train-departure'];
  req.session.data['unloading-place-train'] = req.body['unloading-place-train'];
  req.session.data['freight-bill'] = req.body['freight-bill'];

      // Combine train departure date
  const departureDay = req.body['train-departure-date-day'];
  const departureMonth = req.body['train-departure-date-month'];
  const departureYear = req.body['train-departure-date-year'];
  req.session.data['train-departure-date'] = `${departureDay}/${departureMonth}/${departureYear}`;

  req.session.data['transportTypes'] = req.session.data['transportTypes'] || [];
  req.session.data['transportTypes'].push({
    type: 'Train',
    trainDepartureCountry: req.body['train-departure-country'],
    railwayBill: req.body['railway-bill'],
    trainDeparture: req.body['train-departure'],
    unloadingPlaceTrain: req.body['unloading-place-train'],
    freightBillNumber: req.body['freight-bill'],
    trainDepartureDate: req.session.data['train-departure-date']
  });
  res.redirect('/gamma/sd/transport-documents-train');
});

// Route for handling container vessel transport
router.post('/gamma/sd/transport-container-vessel', function (req, res) {
  req.session.data['container-vessel-departure-country'] = req.body['container-vessel-departure-country'];
  req.session.data['unloading-place-vessel'] = req.body['unloading-place-vessel'];
  req.session.data['vessel-name'] = req.body['vessel-name'];
  req.session.data['flag-state'] = req.body['flag-state'];
  req.session.data['container-vessel-departure'] = req.body['container-vessel-departure'];
  req.session.data['freight-bill'] = req.body['freight-bill'];

      // Combine container vessel departure date
  const departureDay = req.body['container-vessel-departure-date-day'];
  const departureMonth = req.body['container-vessel-departure-date-month'];
  const departureYear = req.body['container-vessel-departure-date-year'];
  req.session.data['container-vessel-departure-date'] = `${departureDay}/${departureMonth}/${departureYear}`;

  req.session.data['transportTypes'] = req.session.data['transportTypes'] || [];
  req.session.data['transportTypes'].push({
    type: 'Container vessel',
    containerVesselDepartureCountry: req.body['container-vessel-departure-country'],
    vesselName: req.body['vessel-name'],
    flagState: req.body['flag-state'],
    unloadingPlaceVessel: req.body['unloading-place-vessel'],
    containerVesselDeparture: req.body['container-vessel-departure'],
    freightBillNumber: req.body['freight-bill'],
    containerVesselDepartureDate: req.session.data['container-vessel-departure-date']
  });
  res.redirect('/gamma/sd/transport-documents-vessel');
});


// TRUCK DOCUMENTS
router.post('/gamma/sd/transport-documents', function (req, res) {
  let documentNames = req.session.data['documentName[]'] || [];
  let referenceNumbers = req.session.data['referenceNumber[]'] || [];

  const names = req.body['documentName[]'] || req.body.documentName;
  const refs = req.body['referenceNumber[]'] || req.body.referenceNumber;
  const editIndex = req.body.editIndex;

  if (editIndex !== undefined && editIndex !== '') {
    documentNames[editIndex] = names;
    referenceNumbers[editIndex] = refs;
  } else {
    if (Array.isArray(names)) {
      documentNames.push(...names);
      referenceNumbers.push(...refs);
    } else {
      documentNames.push(names);
      referenceNumbers.push(refs);
    }
  }

  req.session.data['documentName[]'] = documentNames;
  req.session.data['referenceNumber[]'] = referenceNumbers;

  res.redirect('/gamma/sd/storage-facility-details');
});

// TRAIN DOCUMENTS
router.post('/gamma/sd/transport-documents-train', function (req, res) {
  let documentNames = req.session.data['trainDocumentName[]'] || [];
  let referenceNumbers = req.session.data['trainReferenceNumber[]'] || [];

  const names = req.body['documentName[]'] || req.body.documentName;
  const refs = req.body['referenceNumber[]'] || req.body.referenceNumber;
  const editIndex = req.body.editIndex;

  if (editIndex !== undefined && editIndex !== '') {
    documentNames[editIndex] = names;
    referenceNumbers[editIndex] = refs;
  } else {
    if (Array.isArray(names)) {
      documentNames.push(...names);
      referenceNumbers.push(...refs);
    } else {
      documentNames.push(names);
      referenceNumbers.push(refs);
    }
  }

  req.session.data['trainDocumentName[]'] = documentNames;
  req.session.data['trainReferenceNumber[]'] = referenceNumbers;

  res.redirect('/gamma/sd/storage-facility-details');
});

// PLANE DOCUMENTS
router.post('/gamma/sd/transport-documents-plane', function (req, res) {
  let documentNames = req.session.data['planeDocumentName[]'] || [];
  let referenceNumbers = req.session.data['planeReferenceNumber[]'] || [];

  const names = req.body['documentName[]'] || req.body.documentName;
  const refs = req.body['referenceNumber[]'] || req.body.referenceNumber;
  const editIndex = req.body.editIndex;

  if (editIndex !== undefined && editIndex !== '') {
    documentNames[editIndex] = names;
    referenceNumbers[editIndex] = refs;
  } else {
    if (Array.isArray(names)) {
      documentNames.push(...names);
      referenceNumbers.push(...refs);
    } else {
      documentNames.push(names);
      referenceNumbers.push(refs);
    }
  }

  req.session.data['planeDocumentName[]'] = documentNames;
  req.session.data['planeReferenceNumber[]'] = referenceNumbers;

  res.redirect('/gamma/sd/storage-facility-details');
});

// VESSEL DOCUMENTS
router.post('/gamma/sd/transport-documents-vessel', function (req, res) {
  let documentNames = req.session.data['vesselDocumentName[]'] || [];
  let referenceNumbers = req.session.data['vesselReferenceNumber[]'] || [];

  const names = req.body['documentName[]'] || req.body.documentName;
  const refs = req.body['referenceNumber[]'] || req.body.referenceNumber;
  const editIndex = req.body.editIndex;

  if (editIndex !== undefined && editIndex !== '') {
    documentNames[editIndex] = names;
    referenceNumbers[editIndex] = refs;
  } else {
    if (Array.isArray(names)) {
      documentNames.push(...names);
      referenceNumbers.push(...refs);
    } else {
      documentNames.push(names);
      referenceNumbers.push(refs);
    }
  }

  req.session.data['vesselDocumentName[]'] = documentNames;
  req.session.data['vesselReferenceNumber[]'] = referenceNumbers;

  res.redirect('/gamma/sd/storage-facility-details');
});


// Route for storage facility details
router.post('/gamma/sd/storage-facility-details', function (req, res) {
  req.session.data['facility-name'] = req.body['facility-name'];

  // Combine arrival date
const arrivalDay = req.body['arrival-date-day'];
const arrivalMonth = req.body['arrival-date-month']; // fix typo in HTML
const arrivalYear = req.body['arrival-date-year'];
req.session.data['arrival-date'] = `${arrivalDay}/${arrivalMonth}/${arrivalYear}`;
  // Add more fields as needed
  res.redirect('/gamma/sd/storage-facility-address');
});

// Route for storage facility details
router.post('/gamma/sd/storage-facility-address', function (req, res) {
  req.session.data['postcode'] = req.body['postcode'];
  // Add more fields as needed
  res.redirect('/gamma/sd/storage-facility-address-2');
});

// Route for storage facility address
router.post('/gamma/sd/storage-facility-address-2', function (req, res) {
  req.session.data['building-number'] = req.body['building-number'];
  req.session.data['building-name'] = req.body['building-name'];
  req.session.data['sub-building-name'] = req.body['sub-building-name'];
  req.session.data['street-name'] = req.body['street-name'];
  req.session.data['county'] = req.body['county'];
  req.session.data['country'] = req.body['country'];
  // Add more fields as needed
  res.redirect('/gamma/sd/storage-facility-confirmation');
});

// Route for storage facility confirmation
router.post('/gamma/sd/storage-facility-confirmation', function (req, res) {
  
  // Add more fields as needed
  res.redirect('/gamma/sd/storage-facility-approval');
});

// Route for storage facility approval
router.post('/gamma/sd/storage-facility-approval', function (req, res) {
  let storageTypes = [].concat(req.body['product-storage'] || []);
  storageTypes = storageTypes.filter(item => item !== '_unchecked');
  req.session.data['product-storage'] = storageTypes;
  res.redirect('/gamma/sd/departure-transport-type');
});



// Route for storage facility summary
router.post('/gamma/sd/storage-facility-summary', function (req, res) {
  // Get current values from session
  const facilityName = req.session.data['facility-name'];
  const addAnother = req.body['storage-facility']; // Yes or No

  // Create a new facility entry
  const newFacility = {
    name: facilityName,
  };

  // Save to session array
  if (!req.session.data['storageFacilities']) {
    req.session.data['storageFacilities'] = [];
  }

  req.session.data['storageFacilities'].push(newFacility);

  // Redirect based on user choice
  if (addAnother === 'Yes') {
    res.redirect('/gamma/sd/storage-facility-details');
  } else if (addAnother === 'No') {
    res.redirect('/gamma/sd/departure-transport-type');
  } else {
    res.redirect('/gamma/sd/storage-facility-summary');
  }
});

// Route for departure transport details
router.post('/gamma/sd/departure-transport-type', function (req, res) {
  const transportType = req.body['departure-transport-type'];

  if (transportType === 'Truck') {
    res.redirect('/gamma/sd/departure-transport-truck');
  } else if (transportType === 'Plane') {
    res.redirect('/gamma/sd/departure-transport-plane');
  } else if (transportType === 'Train') {
    res.redirect('/gamma/sd/departure-transport-train');
  } else if (transportType === 'Container vessel') {
    res.redirect('/gamma/sd/departure-transport-container-vessel');
  } else {
    res.redirect('/gamma/sd/departure-transport-type');
  }
});


router.post('/gamma/sd/departure-transport-truck', function (req, res) {
  req.session.data['departure-destination-country'] = req.body['departure-destination-country'];
  req.session.data['destination-point-truck'] = req.body['destination-point-truck'];
  req.session.data['departure-truck-nationality'] = req.body['truck-nationality'];
  req.session.data['departure-truck-registration'] = req.body['registration-number'];
  req.session.data['departure-export-place'] = req.body['export-place'];
  req.session.data['departure-freight-number'] = req.body['freight-number'];
  req.session.data['container-identification-truck'] = req.body['container-identification-truck']; 


  const destinationCountry = req.body['departure-destination-country'];

  // Capture date parts
  const day = req.body['departure-date-uk-day'];
  const month = req.body['departure-date-uk-month'];
  const year = req.body['departure-date-uk-year'];

  // Combine into a single date string (optional formatting)
  const departureDate = `${day}/${month}/${year}`;
  req.session.data['departure-date-uk'] = departureDate;
  

  res.redirect('/gamma/sd/departure-transport-documents');
});

router.post('/gamma/sd/departure-transport-plane', function (req, res) {
  req.session.data['plane-departure-destination-country'] = req.body['plane-departure-destination-country'];
  req.session.data['destination-point-plane'] = req.body['destination-point-plane'];
  req.session.data['departure-airway-bill'] = req.body['airway-bill'];
  req.session.data['departure-flight-number'] = req.body['flight-number'];
  req.session.data['departure-plane-departure'] = req.body['plane-departure'];
  req.session.data['departure-container-identification'] = req.body['container-identification'];

    // Capture date parts
  const day = req.body['plane-departure-date-uk-day'];
  const month = req.body['plane-departure-date-uk-month'];
  const year = req.body['plane-departure-date-uk-year'];

  // Combine into a single date string (optional formatting)
  const departureDate = `${day}/${month}/${year}`;
  req.session.data['plane-departure-date-uk'] = departureDate;

  res.redirect('/gamma/sd/departure-transport-documents-plane');
});

router.post('/gamma/sd/departure-transport-train', function (req, res) {
  req.session.data['train-departure-destination-country'] = req.body['train-departure-destination-country'];
  req.session.data['destination-point-train'] = req.body['destination-point-train'];
  req.session.data['departure-railway-bill'] = req.body['railway-bill'];
  req.session.data['departure-train-departure'] = req.body['train-departure'];
  req.session.data['departure-freight-bill'] = req.body['freight-bill'];
  req.session.data['container-identification-train'] = req.body['container-identification-train']; 

      // Capture date parts
  const day = req.body['train-departure-date-uk-day'];
  const month = req.body['train-departure-date-uk-month'];
  const year = req.body['train-departure-date-uk-year'];
  const departureDate = `${day}/${month}/${year}`;
  req.session.data['train-departure-date-uk'] = departureDate;

  res.redirect('/gamma/sd/departure-transport-documents-train');
});

router.post('/gamma/sd/departure-transport-container-vessel', function (req, res) {
  req.session.data['container-vessel-departure-destination-country'] = req.body['container-vessel-departure-destination-country'];
  req.session.data['destination-point-vessel'] = req.body['destination-point-vessel'];
  req.session.data['departure-vessel-name'] = req.body['vessel-name'];
  req.session.data['departure-flag-state'] = req.body['flag-state'];
  req.session.data['departure-container-vessel-departure'] = req.body['container-vessel-departure'];
  req.session.data['departure-freight-bill'] = req.body['departure-freight-bill'];

      // Capture date parts
  const day = req.body['container-vessel-departure-date-uk-day'];
  const month = req.body['container-vessel-departure-date-uk-month'];
  const year = req.body['container-vessel-departure-date-uk-year'];
  const departureDate = `${day}/${month}/${year}`;
  req.session.data['container-vessel-departure-date-uk'] = departureDate;

  res.redirect('/gamma/sd/departure-transport-documents-vessel');
});

router.post('/gamma/sd/departure-transport-documents', function (req, res) {
  let documentNames = req.session.data['departure-documentName[]'] || [];
  let referenceNumbers = req.session.data['departure-referenceNumber[]'] || [];

  const names = req.body['documentName[]'] || req.body.documentName;
  const refs = req.body['referenceNumber[]'] || req.body.referenceNumber;
  const editIndex = req.body.editIndex;

  if (editIndex !== undefined && editIndex !== '') {
    documentNames[editIndex] = names;
    referenceNumbers[editIndex] = refs;
  } else {
    if (Array.isArray(names)) {
      documentNames.push(...names);
      referenceNumbers.push(...refs);
    } else {
      documentNames.push(names);
      referenceNumbers.push(refs);
    }
  }

  req.session.data['departure-documentName[]'] = documentNames;
  req.session.data['departure-referenceNumber[]'] = referenceNumbers;

  res.redirect('/gamma/sd/departure-summary');
});

router.post('/gamma/sd/departure-transport-documents-plane', function (req, res) {
  let documentNames = req.session.data['departure-planeDocumentName[]'] || [];
  let referenceNumbers = req.session.data['departure-planeReferenceNumber[]'] || [];

  const names = req.body['documentName[]'] || req.body.documentName;
  const refs = req.body['referenceNumber[]'] || req.body.referenceNumber;
  const editIndex = req.body.editIndex;

  if (editIndex !== undefined && editIndex !== '') {
    documentNames[editIndex] = names;
    referenceNumbers[editIndex] = refs;
  } else {
    if (Array.isArray(names)) {
      documentNames.push(...names);
      referenceNumbers.push(...refs);
    } else {
      documentNames.push(names);
      referenceNumbers.push(refs);
    }
  }

  req.session.data['departure-planeDocumentName[]'] = documentNames;
  req.session.data['departure-planeReferenceNumber[]'] = referenceNumbers;

  res.redirect('/gamma/sd/departure-summary');
});

router.post('/gamma/sd/departure-transport-documents-train', function (req, res) {
  let documentNames = req.session.data['departure-trainDocumentName[]'] || [];
  let referenceNumbers = req.session.data['departure-trainReferenceNumber[]'] || [];

  const names = req.body['documentName[]'] || req.body.documentName;
  const refs = req.body['referenceNumber[]'] || req.body.referenceNumber;
  const editIndex = req.body.editIndex;

  if (editIndex !== undefined && editIndex !== '') {
    documentNames[editIndex] = names;
    referenceNumbers[editIndex] = refs;
  } else {
    if (Array.isArray(names)) {
      documentNames.push(...names);
      referenceNumbers.push(...refs);
    } else {
      documentNames.push(names);
      referenceNumbers.push(refs);
    }
  }

  req.session.data['departure-trainDocumentName[]'] = documentNames;
  req.session.data['departure-trainReferenceNumber[]'] = referenceNumbers;

  res.redirect('/gamma/sd/departure-summary');
});

router.post('/gamma/sd/departure-transport-documents-vessel', function (req, res) {
  let documentNames = req.session.data['departure-vesselDocumentName[]'] || [];
  let referenceNumbers = req.session.data['departure-vesselReferenceNumber[]'] || [];

  const names = req.body['documentName[]'] || req.body.documentName;
  const refs = req.body['referenceNumber[]'] || req.body.referenceNumber;
  const editIndex = req.body.editIndex;

  if (editIndex !== undefined && editIndex !== '') {
    documentNames[editIndex] = names;
    referenceNumbers[editIndex] = refs;
  } else {
    if (Array.isArray(names)) {
      documentNames.push(...names);
      referenceNumbers.push(...refs);
    } else {
      documentNames.push(names);
      referenceNumbers.push(refs);
    }
  }

  req.session.data['departure-vesselDocumentName[]'] = documentNames;
  req.session.data['departure-vesselReferenceNumber[]'] = referenceNumbers;

  res.redirect('/gamma/sd/departure-summary');
});


router.get('/gamma/sd/progress', function (req, res) {
  res.render('gamma/sd/progress.html', {
    data: req.session.data
  });
});

// Route for departure summary
router.post('/gamma/sd/departure-summary', function (req, res) {
  const productEntries = req.session.data['productEntries'];

  if (productEntries && Array.isArray(productEntries)) {
    productEntries.forEach((entry, index) => {
      const netWeightKey = `departure-net-weight-${index}`;
      const fishWeightKey = `departure-fish-weight-${index}`;

      entry.departureNetWeight = req.body[netWeightKey];
      entry.departureFishWeight = req.body[fishWeightKey];
    });
  }

  res.redirect('/gamma/sd/progress');
});

router.post('/gamma/sd/progress', function (req, res) {
  // Handle the progress form submission
  const action = req.body._action || req.body.formaction;

  if (action === 'progress') {
    // Redirect to the next step in the journey
    res.redirect('/gamma/sd/check-your-answers');
  } else {
    // Redirect to the previous step or stay on the same page
    res.redirect('/gamma/sd/progress');
  }
});

// Route for handling the 'Your reference' page
router.post('/gamma/ps/your-reference', function (req, res) {
  req.session.data['your-reference'] = req.body['your-reference'];
  // Add more fields as needed

  // Redirect based on which button was pressed
  if (req.body._action === 'progress' || req.body['formaction'] === 'progress') {
    res.redirect('/gamma/ps/progress');
  } else {
    res.redirect('/gamma/ps/exporter-details');
  }
});

// Route for exporter details
router.post('/gamma/ps/exporter-details', function (req, res) {
  req.session.data['company-name'] = req.body['company-name']
  // Add more fields as needed
  res.redirect('/gamma/ps/product-description')
})

// Route for product description
router.post('/gamma/ps/product-description', function (req, res) {
  const newEntry = {
  commodityCode: req.body['commodity-code'],
  description: req.body['description'],
  isPartial: true // flag to indicate it's awaiting details
};

  if (!req.session.data['productEntries']) {
    req.session.data['productEntries'] = [];
  }

  const editIndex = req.session.data['editIndex'];

  if (typeof editIndex !== 'undefined') {
    req.session.data['productEntries'][editIndex] = newEntry;
    delete req.session.data['editIndex'];
  } else {
    req.session.data['productEntries'].push(newEntry);
  }

  req.session.data['description'] = req.body['description'];
  req.session.data['commodity-code'] = req.body['commodity-code'];

  res.redirect('/gamma/ps/product-details');
});

// GET route for product details page
router.get('/gamma/ps/product-details', function (req, res) {
  res.render('gamma/ps/product-details', {
    data: req.session.data || {}
  });
});

// Route for product details
router.post('/gamma/ps/product-details', function (req, res) {
  const action = req.body.action;

  const newDetails = {
    ukDocument: req.body['uk-document'],
    issuingCountry: req.body['issuing-country'], // <-- add this line
    species: req.body['species'],
    productReferenceNumber: req.body['productReferenceNumber'],
    'catch-certificate-weight': req.body['catch-certificate-weight'],
    'net-weight': req.body['net-weight'],
    'fish-weight': req.body['fish-weight'],
    isPartial: false,
    description: req.session.data['description'],
    commodityCode: req.session.data['commodity-code']
  };

  // ✅ Validate required fields before saving
  const hasRequiredFields =
    newDetails.species &&
    newDetails.productReferenceNumber &&
    newDetails['net-weight'] &&
    newDetails['fish-weight'] &&
    newDetails['catch-certificate-weight'];

  if (!req.session.data['productEntries']) {
    req.session.data['productEntries'] = [];
  }

  if (hasRequiredFields) {
    const editIndex = req.session.data['editIndex'];
    if (typeof editIndex !== 'undefined') {
      req.session.data['productEntries'][editIndex] = newDetails;
      delete req.session.data['editIndex'];
    } else {
      req.session.data['productEntries'].push(newDetails);
    }
  }

  // ✅ Store species in session for pre-filling
  req.session.data['species'] = req.body['species'];

  if (action === 'add') {
    res.redirect('/gamma/ps/product-details#species-table-container');
  } else if (action === 'continue') {
    res.redirect('/gamma/ps/updated-product-summary');
  }
});

// Route for product summary search and pagination
router.get('/gamma/ps/product-summary', function (req, res) {

  const searchQuery = (req.query.s || '').toLowerCase();
  const page = parseInt(req.query.page) || 1;
  const perPage = 10;

  let productEntries = req.session.data['productEntries'] || [];

// Filter
if (searchQuery) {
  productEntries = productEntries.filter(entry =>
    (entry.description ?? '').toString().toLowerCase().includes(searchQuery) ||
    (entry.species ?? '').toString().toLowerCase().includes(searchQuery) ||
    (entry.commodityCode ?? '').toString().toLowerCase().includes(searchQuery) ||
    (
      Array.isArray(entry.productReferenceNumber)
        ? entry.productReferenceNumber.some(ref =>
            ref.toLowerCase().includes(searchQuery)
          )
        : (entry.productReferenceNumber ?? '').toString().toLowerCase().includes(searchQuery)
    )
  );
}



  // Paginate
  const totalPages = Math.ceil(productEntries.length / perPage);
  const paginatedEntries = productEntries.slice((page - 1) * perPage, page * perPage);

  res.render('gamma/ps/product-summary', {
    data: {
      productEntries: paginatedEntries,
      description: req.session.data['description']
    },
    currentPage: page,
    totalPages,
    searchQuery
  });
});

router.get('/gamma/ps/edit-product/:index', function (req, res) {
  const index = parseInt(req.params.index);
  const product = req.session.data['productEntries'][index];

  // Pre-fill session fields with selected product
  req.session.data['uk-document'] = product.ukDocument;
  req.session.data['productReferenceNumber'] = product.productReferenceNumber;
  req.session.data['species'] = product.species;
  req.session.data['commodity-code'] = product.commodityCode;
  req.session.data['description'] = product.description;
  req.session.data['net-weight'] = product.netWeight;
  req.session.data['fish-weight'] = product.fishWeight;

  // Store index for update later
  req.session.data['editIndex'] = index;

  res.redirect('/gamma/ps/product-details');
});

// Route for product summary
router.post('/gamma/ps/product-summary', function (req, res) {
  req.session.data['more-products'] = req.body['more-products'];

  const productEntries = req.body['more-products'];

  if (productEntries === 'Yes') {
    // ✅ Clear single-entry fields to prevent carry-over
    req.session.data['uk-document'] = '';
    req.session.data['productReferenceNumber'] = '';
    req.session.data['species'] = '';
    req.session.data['commodity-code'] = '';
    req.session.data['description'] = '';
    req.session.data['net-weight'] = '';
    req.session.data['fish-weight'] = '';
    req.session.data['catch-certificate-weight'] = '';

    // ✅ Clear edit index to ensure new entry is created
    delete req.session.data['editIndex'];

    // ❌ Do NOT clear productEntries — keep previous products
    // req.session.data['productEntries'] = []; ← removed

    res.redirect('/gamma/ps/product-description'); // stays in PS flow
  } else if (productEntries === 'No') {
    res.redirect('/gamma/ps/plant-details');
} else {
  // Render the summary page directly if no selection
  res.render('gamma/ps/product-summary', {
    data: {
      productEntries: req.session.data['productEntries'],
      description: req.session.data['description']
    },
    currentPage: 1,
    totalPages: Math.ceil((req.session.data['productEntries'] || []).length / 10),
    searchQuery: ''
  });
}

});

// Route for updated-product-summary
router.get('/gamma/ps/updated-product-summary', function (req, res) {
  const searchQuery = (req.query.s || '').toLowerCase();
  const page = parseInt(req.query.page) || 1;
  const perPage = 10;

  const allProductEntries = req.session.data['productEntries'] || [];

  // Filter out partial or incomplete entries
  let filteredEntries = allProductEntries.filter(entry =>
    !entry.isPartial && entry.species
  );

  // Apply search filter
  if (searchQuery) {
    filteredEntries = filteredEntries.filter(entry =>
      (entry.description ?? '').toLowerCase().includes(searchQuery) ||
      (entry.species ?? '').toLowerCase().includes(searchQuery) ||
      (entry.commodityCode ?? '').toLowerCase().includes(searchQuery) ||
      (
        Array.isArray(entry.productReferenceNumber)
          ? entry.productReferenceNumber.some(ref =>
              ref.toLowerCase().includes(searchQuery)
            )
          : (entry.productReferenceNumber ?? '').toLowerCase().includes(searchQuery)
      )
    );
  }

  // Paginate after filtering
  const totalPages = Math.ceil(filteredEntries.length / perPage);
  const paginatedEntries = filteredEntries.slice((page - 1) * perPage, page * perPage);

  res.render('gamma/ps/updated-product-summary', {
    data: {
      productEntries: paginatedEntries,       // filtered + paginated
      allProductEntries: allProductEntries    // full list for counting
    },
    currentPage: page,
    totalPages,
    searchQuery
  });
});

//Route for updated-product-summary
router.post('/gamma/ps/updated-product-summary', function (req, res) {
  const moreProducts = req.body['more-products'];
  req.session.data['more-products'] = moreProducts;

  if (moreProducts === 'Yes') {
    // Clear single-entry fields
    req.session.data['uk-document'] = '';
    req.session.data['productReferenceNumber'] = '';
    req.session.data['species'] = '';
    req.session.data['commodity-code'] = '';
    req.session.data['description'] = '';
    req.session.data['net-weight'] = '';
    req.session.data['fish-weight'] = '';
    req.session.data['catch-certificate-weight'] = '';
    delete req.session.data['editIndex'];

    res.redirect('/gamma/ps/product-description');
  } else if (moreProducts === 'No') {
    res.redirect('/gamma/ps/plant-details');
  } else {
    // No selection made — redirect to GET route
    res.redirect('/gamma/ps/updated-product-summary');
  }
});



// Route for storage facility details
router.post('/gamma/ps/plant-details', function (req, res) {
  req.session.data['plant-name'] = req.body['plant-name'];
  req.session.data['person-name'] = req.body['person-name'];
  req.session.data['approval-number'] = req.body['approval-number'];
  // Add more fields as needed
  res.redirect('/gamma/ps/plant-address');
});

// Route for storage facility details
router.post('/gamma/ps/plant-address', function (req, res) {
  req.session.data['postcode'] = req.body['postcode'];
  // Add more fields as needed
  res.redirect('/gamma/ps/plant-address-2');
});

// Route for storage facility address
router.post('/gamma/ps/plant-address-2', function (req, res) {
  req.session.data['building-number'] = req.body['building-number'];
  req.session.data['building-name'] = req.body['building-name'];
  req.session.data['sub-building-name'] = req.body['sub-building-name'];
  req.session.data['street-name'] = req.body['street-name'];
  req.session.data['county'] = req.body['county'];
  req.session.data['country'] = req.body['country'];
  // Add more fields as needed
  res.redirect('/gamma/ps/plant-confirmation');
});

// Route for storage facility confirmation
router.post('/gamma/ps/plant-confirmation', function (req, res) {
  
  // Add more fields as needed
  res.redirect('/gamma/ps/health-certificate');

});

// Route for health certificate details
router.post('/gamma/ps/health-certificate', function (req, res) {
  req.session.data['health-certificate'] = req.body['health-certificate'];

    // Combine arrival date
const arrivalDay = req.body['certificate-date-day'];
const arrivalMonth = req.body['certificate-date-month']; // fix typo in HTML
const arrivalYear = req.body['certificate-date-year'];
req.session.data['certificate-date'] = `${arrivalDay}/${arrivalMonth}/${arrivalYear}`;
  // Add more fields as needed
  res.redirect('/gamma/ps/departure-destination');
});

// Route for departure destination
router.post('/gamma/ps/departure-destination', function (req, res) {
  req.session.data['departure-destination-country'] = req.body['departure-destination-country'];
  // Add more fields as needed
  res.redirect('/gamma/ps/progress');
});

router.post('/gamma/ps/progress', function (req, res) {
  // Handle the progress form submission
  const action = req.body._action || req.body.formaction;

  if (action === 'progress') {
    // Redirect to the next step in the journey
    res.redirect('/gamma/ps/check-your-answers');
  } else {
    // Redirect to the previous step or stay on the same page
    res.redirect('/gamma/ps/progress');
  }
});

// Container identification validation for catch certificate truck transport
router.post('/gamma/ur/cc-transport-truck', function (req, res) {
  // Save all form data first
  req.session.data['truck-nationality'] = req.body['truck-nationality'];
  req.session.data['registration-number'] = req.body['registration-number'];
  req.session.data['export-place'] = req.body['export-place'];
  req.session.data['destination-point-truck'] = req.body['destination-point-truck'];
  req.session.data['freight-number'] = req.body['freight-number'];
  
  const containerNumber = req.body['container-identification-truck'];
  req.session.data['container-identification-truck'] = containerNumber;
  
  // Regex pattern: 3 letters, then U/J/Z/R, then 7 numbers
  const validPattern = /^[A-Z]{3}[UJZR]\d{7}$/;
  
  // Only validate if field has a value (it's optional)
  if (containerNumber && containerNumber.trim() !== '') {
    if (!validPattern.test(containerNumber.trim().toUpperCase())) {
      // Invalid format - redirect to error page
      return res.redirect('/gamma/ur/cc-transport-truck-error');
    }
  }
  
  // Valid or empty - continue to next page
  res.redirect('/gamma/ur/cc-transport-documents');
});

// Container identification validation for catch certificate train transport
router.post('/gamma/ur/cc-transport-train', function (req, res) {
  // Save all form data first
  req.session.data['railway-bill'] = req.body['railway-bill'];
  req.session.data['train-departure'] = req.body['train-departure'];
  req.session.data['freight-bill'] = req.body['freight-bill'];
  
  const containerNumber = req.body['container-identification-train'];
  req.session.data['container-identification-train'] = containerNumber;
  
  const validPattern = /^[A-Z]{3}[UJZR]\d{7}$/;
  
  if (containerNumber && containerNumber.trim() !== '') {
    if (!validPattern.test(containerNumber.trim().toUpperCase())) {
      return res.redirect('/gamma/ur/cc-transport-train-error');
    }
  }
  
  res.redirect('/gamma/ur/cc-transport-documents-train');
});

// Container identification validation for non-manipulation document truck transport
router.post('/gamma/ur/nmd-transport-truck', function (req, res) {
  // Save all form data first
  req.session.data['truck-nationality'] = req.body['truck-nationality'];
  req.session.data['registration-number'] = req.body['registration-number'];
  req.session.data['export-place'] = req.body['export-place'];
  req.session.data['destination-point-truck'] = req.body['destination-point-truck'];
  req.session.data['freight-number'] = req.body['freight-number'];
  
  const containerNumber = req.body['container-identification-truck'];
  req.session.data['container-identification-truck'] = containerNumber;
  
  const validPattern = /^[A-Z]{3}[UJZR]\d{7}$/;
  
  if (containerNumber && containerNumber.trim() !== '') {
    if (!validPattern.test(containerNumber.trim().toUpperCase())) {
      return res.redirect('/gamma/ur/nmd-transport-truck-error');
    }
  }
  
  res.redirect('/gamma/ur/nmd-transport-documents');
});

// Container identification validation for non-manipulation document train transport
router.post('/gamma/ur/nmd-transport-train', function (req, res) {
  // Save all form data first
  req.session.data['railway-bill'] = req.body['railway-bill'];
  req.session.data['train-departure'] = req.body['train-departure'];
  req.session.data['freight-bill'] = req.body['freight-bill'];
  
  const containerNumber = req.body['container-identification-train'];
  req.session.data['container-identification-train'] = containerNumber;
  
  const validPattern = /^[A-Z]{3}[UJZR]\d{7}$/;
  
  if (containerNumber && containerNumber.trim() !== '') {
    if (!validPattern.test(containerNumber.trim().toUpperCase())) {
      return res.redirect('/gamma/ur/nmd-transport-train-error');
    }
  }
  
  res.redirect('/gamma/ur/nmd-transport-documents-train');
});


// Delta routes
// Route for displaying the 'Check your answers' page
router.get('/delta/transport/check-your-answers', function (req, res) {
  const data = req.session.data;
  const groupedTransportTypes = getGroupedTransportTypes(data);
  res.render('delta/transport/check-your-answers', {
    data,
    groupedTransportTypes
  });
});


// Route for handling transport selection
router.post('/delta/transport/transport-type', function (req, res) {
  const transportType = req.body['transport-type'];

  if (transportType === 'Truck') {
    res.redirect('/delta/transport/transport-truck');
  } else if (transportType === 'Plane') {
    res.redirect('/delta/transport/transport-plane');
  } else if (transportType === 'Train') {
    res.redirect('/delta/transport/transport-train');
  } else if (transportType === 'Container vessel') {
    res.redirect('/delta/transport/transport-container-vessel');
  } else {
    res.redirect('/delta/transport/transport-type');  // Redirect back if no option selected

  }
});

// Route for handling landings option selection
router.post('/delta/landings-entry', function (req, res) {
  const landingsOption = req.body['landings-option'];

  if (landingsOption === 'dl' || landingsOption === 'manual' || landingsOption === 'upload') {
    req.session.data['landingsOption'] = landingsOption;
    res.redirect('/delta/catch/progress'); // Always go to progress, like gamma
  } else {
    res.redirect('/delta/catch/landings-entry'); // Redirect back if no option selected
  }
});

// Route for handling landings option selection (catch subfolder version)
router.post('/delta/catch/landings-entry', function (req, res) {
  const landingsOption = req.body['landings-option'];

  if (landingsOption === 'dl' || landingsOption === 'manual' || landingsOption === 'upload') {
    req.session.data['landingsOption'] = landingsOption;
    res.redirect('/delta/catch/progress');
  } else {
    res.redirect('/delta/catch/landings-entry');
  }
});




// Route for handling truck transport
router.post('/delta/transport/transport-truck', function (req, res) {
  req.session.data['truck-nationality'] = req.body['truck-nationality'];
  req.session.data['truck-registration'] = req.body['registration-number'];
  req.session.data['export-place'] = req.body['export-place'];
  req.session.data['destination-point-truck'] = req.body['destination-point-truck'];
  req.session.data['freight-number'] = req.body['freight-number'];
  req.session.data['container-identification-truck'] = req.body['container-identification-truck']; // single value

  // Add to transportTypes array in session
  req.session.data['transportTypes'] = req.session.data['transportTypes'] || [];
  req.session.data['transportTypes'].push({
    type: 'Truck',
    truckNationality: req.body['truck-nationality'],
    truckRegistration: req.body['registration-number'],
    exportPlace: req.body['export-place'],
    destinationPoint: req.body['destination-point-truck'],
    freightBillNumber: req.body['freight-number'],
    containerIdentification: req.body['container-identification-truck']
  });
 
  res.redirect('/delta/transport/transport-documents');
});

// Route for handling plane transport
router.post('/delta/transport/transport-plane', function (req, res) {
  req.session.data['airway-bill'] = req.body['airway-bill'];
  req.session.data['flight-number'] = req.body['flight-number'];
  req.session.data['plane-departure'] = req.body['plane-departure'];
  req.session.data['destination-point-plane'] = req.body['destination-point-plane'];
  req.session.data['container-identification'] = req.body['container-identification'];

  req.session.data['transportTypes'] = req.session.data['transportTypes'] || [];
  req.session.data['transportTypes'].push({
    type: 'Plane',
    flightNumber: req.body['flight-number'],
    planeDeparture: req.body['plane-departure'],
    destinationPoint: req.body['destination-point-plane'],
    airwayBill: req.body['airway-bill'],
    containerIdentification: req.body['container-identification']
  });
  res.redirect('/delta/transport/transport-documents-plane');
});

// Route for handling train transport
router.post('/delta/transport/transport-train', function (req, res) {
  req.session.data['railway-bill'] = req.body['railway-bill'];
  req.session.data['train-departure'] = req.body['train-departure'];
  req.session.data['destination-point-train'] = req.body['destination-point-train'];
  req.session.data['freight-bill'] = req.body['freight-bill'];
  req.session.data['container-identification-train'] = req.body['container-identification-train']; // single value


  req.session.data['transportTypes'] = req.session.data['transportTypes'] || [];
  req.session.data['transportTypes'].push({
    type: 'Train',
    railwayBill: req.body['railway-bill'],
    trainDeparture: req.body['train-departure'],
    destinationPoint: req.body['destination-point-train'],
    freightBillNumber: req.body['freight-bill'],
    containerIdentification: req.body['container-identification-train']
  });
  res.redirect('/delta/transport/transport-documents-train');
});

// Route for handling container vessel transport
router.post('/delta/transport/transport-container-vessel', function (req, res) {
  req.session.data['vessel-name'] = req.body['vessel-name'];
  req.session.data['flag-state'] = req.body['flag-state'];
  req.session.data['container-vessel-departure'] = req.body['container-vessel-departure'];
  req.session.data['destination-point-vessel'] = req.body['destination-point-vessel'];
  req.session.data['freight-bill'] = req.body['freight-bill'];

  req.session.data['transportTypes'] = req.session.data['transportTypes'] || [];
  req.session.data['transportTypes'].push({
    type: 'Container vessel',
    vesselName: req.body['vessel-name'],
    flagState: req.body['flag-state'],
    containerVesselDeparture: req.body['container-vessel-departure'],
    destinationPoint: req.body['destination-point-vessel'],
    freightBillNumber: req.body['freight-bill']
  });
  res.redirect('/delta/transport/transport-documents-vessel');
});


// TRUCK DOCUMENTS
router.post('/delta/transport/transport-documents', function (req, res) {
  let documentNames = req.session.data['documentName[]'] || [];
  let referenceNumbers = req.session.data['referenceNumber[]'] || [];

  const names = req.body['documentName[]'] || req.body.documentName;
  const refs = req.body['referenceNumber[]'] || req.body.referenceNumber;
  const editIndex = req.body.editIndex;

  if (editIndex !== undefined && editIndex !== '') {
    documentNames[editIndex] = names;
    referenceNumbers[editIndex] = refs;
  } else {
    if (Array.isArray(names)) {
      documentNames.push(...names);
      referenceNumbers.push(...refs);
    } else {
      documentNames.push(names);
      referenceNumbers.push(refs);
    }
  }

  req.session.data['documentName[]'] = documentNames;
  req.session.data['referenceNumber[]'] = referenceNumbers;

  res.redirect('/delta/transport/transport-additional');
});

// TRAIN DOCUMENTS
router.post('/delta/transport/transport-documents-train', function (req, res) {
  let documentNames = req.session.data['trainDocumentName[]'] || [];
  let referenceNumbers = req.session.data['trainReferenceNumber[]'] || [];

  const names = req.body['documentName[]'] || req.body.documentName;
  const refs = req.body['referenceNumber[]'] || req.body.referenceNumber;
  const editIndex = req.body.editIndex;

  if (editIndex !== undefined && editIndex !== '') {
    documentNames[editIndex] = names;
    referenceNumbers[editIndex] = refs;
  } else {
    if (Array.isArray(names)) {
      documentNames.push(...names);
      referenceNumbers.push(...refs);
    } else {
      documentNames.push(names);
      referenceNumbers.push(refs);
    }
  }

  req.session.data['trainDocumentName[]'] = documentNames;
  req.session.data['trainReferenceNumber[]'] = referenceNumbers;

  res.redirect('/delta/transport/transport-additional');
});

// PLANE DOCUMENTS
router.post('/delta/transport/transport-documents-plane', function (req, res) {
  let documentNames = req.session.data['planeDocumentName[]'] || [];
  let referenceNumbers = req.session.data['planeReferenceNumber[]'] || [];

  const names = req.body['documentName[]'] || req.body.documentName;
  const refs = req.body['referenceNumber[]'] || req.body.referenceNumber;
  const editIndex = req.body.editIndex;

  if (editIndex !== undefined && editIndex !== '') {
    documentNames[editIndex] = names;
    referenceNumbers[editIndex] = refs;
  } else {
    if (Array.isArray(names)) {
      documentNames.push(...names);
      referenceNumbers.push(...refs);
    } else {
      documentNames.push(names);
      referenceNumbers.push(refs);
    }
  }

  req.session.data['planeDocumentName[]'] = documentNames;
  req.session.data['planeReferenceNumber[]'] = referenceNumbers;

  res.redirect('/delta/transport/transport-additional');
});

// VESSEL DOCUMENTS
router.post('/delta/transport/transport-documents-vessel', function (req, res) {
  let documentNames = req.session.data['vesselDocumentName[]'] || [];
  let referenceNumbers = req.session.data['vesselReferenceNumber[]'] || [];

  const names = req.body['documentName[]'] || req.body.documentName;
  const refs = req.body['referenceNumber[]'] || req.body.referenceNumber;
  const editIndex = req.body.editIndex;

  if (editIndex !== undefined && editIndex !== '') {
    documentNames[editIndex] = names;
    referenceNumbers[editIndex] = refs;
  } else {
    if (Array.isArray(names)) {
      documentNames.push(...names);
      referenceNumbers.push(...refs);
    } else {
      documentNames.push(names);
      referenceNumbers.push(refs);
    }
  }

  req.session.data['vesselDocumentName[]'] = documentNames;
  req.session.data['vesselReferenceNumber[]'] = referenceNumbers;

  res.redirect('/delta/transport/transport-additional');
});





router.post('/delta/transport/transport-additional', function (req, res) {
  // Handle removal of a transport row
  const removeIndex = req.body.removeIndex;
  if (removeIndex !== undefined && removeIndex !== '') {
    let transportTypes = req.session.data['transportTypes'] || [];
    // Get the type of the transport being removed
    const removed = transportTypes[removeIndex];
    const removedType = removed && removed.type;
    transportTypes.splice(removeIndex, 1);
    req.session.data['transportTypes'] = transportTypes;
    // Only remove from the relevant document/reference arrays for the removed type
    if (removedType === 'Truck') {
      let documentNames = req.session.data['documentName[]'] || [];
      let referenceNumbers = req.session.data['referenceNumber[]'] || [];
      if (documentNames.length > removeIndex) documentNames.splice(removeIndex, 1);
      if (referenceNumbers.length > removeIndex) referenceNumbers.splice(removeIndex, 1);
      req.session.data['documentName[]'] = documentNames;
      req.session.data['referenceNumber[]'] = referenceNumbers;
    } else if (removedType === 'Train') {
      let trainDocumentNames = req.session.data['trainDocumentName[]'] || [];
      let trainReferenceNumbers = req.session.data['trainReferenceNumber[]'] || [];
      if (trainDocumentNames.length > removeIndex) trainDocumentNames.splice(removeIndex, 1);
      if (trainReferenceNumbers.length > removeIndex) trainReferenceNumbers.splice(removeIndex, 1);
      req.session.data['trainDocumentName[]'] = trainDocumentNames;
      req.session.data['trainReferenceNumber[]'] = trainReferenceNumbers;
    } else if (removedType === 'Plane') {
      let planeDocumentNames = req.session.data['planeDocumentName[]'] || [];
      let planeReferenceNumbers = req.session.data['planeReferenceNumber[]'] || [];
      if (planeDocumentNames.length > removeIndex) planeDocumentNames.splice(removeIndex, 1);
      if (planeReferenceNumbers.length > removeIndex) planeReferenceNumbers.splice(removeIndex, 1);
      req.session.data['planeDocumentName[]'] = planeDocumentNames;
      req.session.data['planeReferenceNumber[]'] = planeReferenceNumbers;
    } else if (removedType === 'Container vessel') {
      let vesselDocumentNames = req.session.data['vesselDocumentName[]'] || [];
      let vesselReferenceNumbers = req.session.data['vesselReferenceNumber[]'] || [];
      if (vesselDocumentNames.length > removeIndex) vesselDocumentNames.splice(removeIndex, 1);
      if (vesselReferenceNumbers.length > removeIndex) vesselReferenceNumbers.splice(removeIndex, 1);
      req.session.data['vesselDocumentName[]'] = vesselDocumentNames;
      req.session.data['vesselReferenceNumber[]'] = vesselReferenceNumbers;
    }
    return res.redirect('/delta/transport/transport-additional');
  }
  let documentNames = req.session.data['documentName[]'] || [];
  let referenceNumbers = req.session.data['referenceNumber[]'] || [];

  const name = req.body['documentName[]'];
  const ref = req.body['referenceNumber[]'];
  const editIndex = req.body.editIndex;

  if (editIndex !== undefined && editIndex !== '') {
    documentNames[editIndex] = name;
    referenceNumbers[editIndex] = ref;
  } else {
    if (Array.isArray(name)) {
      documentNames.push(...name);
      referenceNumbers.push(...ref);
    } else {
      documentNames.push(name);
      referenceNumbers.push(ref);
    }
  }

  // Save the updated document names and reference numbers back to the session

  req.session.data['documentName[]'] = documentNames;
  req.session.data['referenceNumber[]'] = referenceNumbers;
  req.session.data['additional-modes'] = req.body['additional-modes'];

  const additionalModes = req.body['additional-modes'];
  if (additionalModes === 'Yes') {
    res.redirect('/delta/transport/transport-type');
  } else if (additionalModes === 'No') {
    res.redirect('/delta/progress-complete');
  } else {
    res.redirect('/delta/transport/transport-additional');
  }
});

// Route for handling the 'Your reference' page
router.post('/delta/your-reference', function (req, res) {
  req.session.data['your-reference'] = req.body['your-reference'];
  // Add more fields as needed

  // Redirect based on which button was pressed
  if (req.body._action === 'progress' || req.body['formaction'] === 'progress') {
    res.redirect('/delta/progress');
  } else {
    res.redirect('/delta/exporter-details');
  }
});


// GET handler for your-reference
router.get('/delta/catch/your-reference', function (req, res) {
  res.render('delta/catch/your-reference', { data: req.session.data });
});

// POST handler for your-reference
router.post('/delta/catch/your-reference', function (req, res) {
  req.session.data['your-reference'] = req.body['your-reference'];
  res.redirect('/delta/catch/exporter-details');
});

// GET handler for exporter details
router.get('/delta/catch/exporter-details', function (req, res) {
  res.render('delta/catch/exporter-details', { data: req.session.data });
});

// Route for exporter details
router.post('/delta/catch/exporter-details', function (req, res) {
  req.session.data['exporter-name'] = req.body['exporter-name']
  req.session.data['company-name'] = req.body['exporter-name']
  // Add more fields as needed
  res.redirect('/delta/catch/add-products')
})

// Route for delta catch proceed to landings (conditional based on landing option)
// GET handler for add-products
router.get('/delta/catch/add-products', function (req, res) {
  res.render('delta/catch/add-products', { data: req.session.data });
});

// Conditional redirect based on stored landing option
router.post('/delta/catch/proceed-landing', function (req, res) {
  const landingsOption = req.session.data['landingsOption'] || 'dl';
  if (landingsOption === 'manual' || landingsOption === 'upload') {
    res.redirect('/delta/catch/manual-entry');
  } else {
    res.redirect('/delta/catch/direct-landing');
  }
});

// Route for delta catch add landing
router.post('/delta/catch/add-landing', function (req, res) {
  const landings = req.session.data['landings'] || [];
  const species = req.body['species'] || '—';
  const state = req.body['state'] || '—';
  const presentation = req.body['presentation'] || '—';

  landings.push({
    product: species + ', ' + state + ', ' + presentation,
    startDate: req.body['startDate'] || '',
    dateLanded: req.body['dateLanded'] || '',
    catchArea: req.body['faoArea'] || '',
    vessel: req.body['vessel'] || '',
    gearCategory: req.body['gear1'] || '',
    gearType: req.body['gear2'] || '',
    exportWeight: req.body['weight'] || ''
  });
  req.session.data['landings'] = landings;

  // Calculate total export weight from all landings
  const totalWeight = landings.reduce((sum, landing) => sum + (parseFloat(landing.exportWeight) || 0), 0);
  req.session.data['totalWeight'] = totalWeight.toFixed(2);

  // Calculate export weight per product
  const productWeights = {};
  landings.forEach(landing => {
    const key = landing.product;
    productWeights[key] = (productWeights[key] || 0) + (parseFloat(landing.exportWeight) || 0);
  });

  // Update products with their calculated export weights from landings
  const products = req.session.data['products'] || [];
  products.forEach(product => {
    const productKey = (product.species || '—') + ', ' + (product.state || '—') + ', ' + (product.presentation || '—');
    product.exportWeight = productWeights[productKey] ? productWeights[productKey].toFixed(2) : '0.00';
  });
  req.session.data['products'] = products;

  res.redirect('/delta/catch/manual-entry');
});

router.post('/delta/catch/add-products', function (req, res) {
  const products = req.session.data['products'] ?? [];
  const {
    species,
    state,
    presentation,
    'commodity-code': commodityCode
  } = req.body;
  products.push({
    species,
    state,
    presentation,
    commodityCode
  });
  req.session.data['products'] = products;
  res.redirect('/delta/catch/add-products');
})

// Redirect to the next step or back to add-products page
router.post('/delta/catch/delete-product/:index', function (req, res) {
  const products = req.session.data['products'] ?? [];
  products.splice(parseInt(req.params.index) - 1, 1);
  req.session.data['products'] = products;
  res.redirect('/delta/catch/add-products');

})

// GET handlers for catch pages
router.get('/delta/catch/your-reference', function (req, res) {
  res.render('delta/catch/your-reference', { data: req.session.data });
});

router.get('/delta/catch/landings-entry', function (req, res) {
  res.render('delta/catch/landings-entry', { data: req.session.data });
});

router.get('/delta/catch/catch-waters', function (req, res) {
  res.render('delta/catch/catch-waters', { data: req.session.data });
});

router.get('/delta/catch/export-journey', function (req, res) {
  res.render('delta/catch/export-journey', { data: req.session.data });
});

router.get('/delta/catch/progress', function (req, res) {
  res.render('delta/catch/progress', { data: req.session.data });
});

router.get('/delta/catch/direct-landing', function (req, res) {
  res.render('delta/catch/direct-landing', { data: req.session.data });
});

router.get('/delta/catch/manual-entry', function (req, res) {
  res.render('delta/catch/manual-entry', { data: req.session.data });
});

router.get('/delta/catch/upload-file', function (req, res) {
  res.render('delta/catch/upload-file', { data: req.session.data });
});

router.get('/delta/catch/product-favourites', function (req, res) {
  res.render('delta/catch/product-favourites', { data: req.session.data });
});

// GET handlers for transport pages
router.get('/delta/catch/transport/transport-type', function (req, res) {
  res.render('delta/catch/transport/transport-type', { data: req.session.data });
});

router.get('/delta/catch/transport/transport-additional', function (req, res) {
  res.render('delta/catch/transport/transport-additional', { data: req.session.data });
});

router.get('/delta/catch/transport/transport-truck', function (req, res) {
  res.render('delta/catch/transport/transport-truck', { data: req.session.data });
});

router.get('/delta/catch/transport/transport-train', function (req, res) {
  res.render('delta/catch/transport/transport-train', { data: req.session.data });
});

router.get('/delta/catch/transport/transport-plane', function (req, res) {
  res.render('delta/catch/transport/transport-plane', { data: req.session.data });
});

router.get('/delta/catch/transport/transport-container-vessel', function (req, res) {
  res.render('delta/catch/transport/transport-container-vessel', { data: req.session.data });
});

router.get('/delta/catch/transport/transport-documents', function (req, res) {
  res.render('delta/catch/transport/transport-documents', { data: req.session.data });
});

router.get('/delta/catch/transport/transport-documents-plane', function (req, res) {
  res.render('delta/catch/transport/transport-documents-plane', { data: req.session.data });
});

router.get('/delta/catch/transport/transport-documents-train', function (req, res) {
  res.render('delta/catch/transport/transport-documents-train', { data: req.session.data });
});

router.get('/delta/catch/transport/transport-documents-vessel', function (req, res) {
  res.render('delta/catch/transport/transport-documents-vessel', { data: req.session.data });
});


// Route for adding a product favourite
router.post('/delta/product-favourites', function (req, res) {
  const favourites = req.session.data['favourites'] ?? [];
  const {
    species,
    state,
    presentation,
    'commodity-code': commodityCode
  } = req.body;

  favourites.push({
    species,
    state,
    presentation,
    commodityCode
  });

  req.session.data['favourites'] = favourites;
  res.redirect('/delta/product-favourites');
});

// Route for deleting a product favourite by index
router.post('/delta/delete-favourite/:index', function (req, res) {
  const favourites = req.session.data['favourites'] ?? [];
  favourites.splice(parseInt(req.params.index), 1);
  req.session.data['favourites'] = favourites;
  res.redirect('/delta/product-favourites');
});

// Route for rendering the product favourites page
router.get('/delta/product-favourites', function (req, res) {
  res.render('delta/product-favourites', { data: req.session.data });
});


// Route for displaying the add-landings page
router.get('/delta/direct-landing', function (req, res) {
  res.render('delta/catch/direct-landing', { data: req.session.data });
});

// Route for landing details
router.post('../delta/direct-landing', function (req, res) {
  const session = req.session.data;

  // Save form fields to session
  session['startDateDay'] = req.body['startDateDay'];
  session['startDateMonth'] = req.body['startDateMonth'];
  session['startDateYear'] = req.body['startDateYear'];

  session['day'] = req.body['dateLandedDay'];
  session['month'] = req.body['dateLandedMonth'];
  session['year'] = req.body['dateLandedYear'];

  session['faoArea'] = req.body['faoArea'];
  session['highSeas'] = req.body['highSeas'];
  session['eez'] = req.body['eez'];
  session['rfmo'] = req.body['rfmo'];
  session['vessel'] = req.body['vessel'];
  session['gear1'] = req.body['gear1'];
  session['gear2'] = req.body['gear2'];


 // Save weights array
session['weights'] = req.body['weights'];

// Calculate total export weight
let totalWeight = 0;
const weights = req.body['weights'];

if (weights) {
  for (const item of Object.values(weights)) {
    const weight = parseFloat(item.exportWeight);
    if (!isNaN(weight)) {
      totalWeight += weight;
    }
  }
}

session['totalWeight'] = totalWeight.toFixed(2);


res.redirect('../delta/catch-waters');

});


// Route for landing details
router.post('../delta/manual-entry', function (req, res) {
  const session = req.session.data;

  // Save form fields to session
  session['startDateDay'] = req.body['startDateDay'];
  session['startDateMonth'] = req.body['startDateMonth'];
  session['startDateYear'] = req.body['startDateYear'];

  session['day'] = req.body['dateLandedDay'];
  session['month'] = req.body['dateLandedMonth'];
  session['year'] = req.body['dateLandedYear'];

  session['faoArea'] = req.body['faoArea'];
  session['highSeas'] = req.body['highSeas'];
  session['eez'] = req.body['eez'];
  session['rfmo'] = req.body['rfmo'];
  session['vessel'] = req.body['vessel'];
  session['gear1'] = req.body['gear1'];
  session['gear2'] = req.body['gear2'];

  session['weights'] = req.body['weights']; // This is an array of objects

  // Calculate total weight
  let totalWeight = 0;
  const weights = req.body['weights'];

  if (weights) {
    for (const item of Object.values(weights)) {
      const weight = parseFloat(item.exportWeight);
      if (!isNaN(weight)) {
        totalWeight += weight;
      }
    }
  }

  session['totalWeight'] = totalWeight.toFixed(2);

  // Track landings
  if (!session.landings) {
    session.landings = [];
  }

  // Add new landing to the array
  session.landings.push({
    startDateDay: req.body['startDateDay'],
    startDateMonth: req.body['startDateMonth'],
    startDateYear: req.body['startDateYear'],
    dateLandedDay: req.body['dateLandedDay'],
    dateLandedMonth: req.body['dateLandedMonth'],
    dateLandedYear: req.body['dateLandedYear'],
    faoArea: req.body['faoArea'],
    vessel: req.body['vessel'],
    gear1: req.body['gear1'],
    gear2: req.body['gear2'],
    weights: req.body['weights']
  });

  // Save landing count
  session['landingCount'] = session.landings.length;

  // Redirect to the next step
  res.redirect('../delta/catch-waters');
});



// Route for export journey


router.post('../delta/catch-waters', function (req, res) {
  req.session.data['waters'] = req.body['waters']; // This will be an array if multiple checkboxes are selected
  res.redirect('../delta/export-journey');
});

// Proper absolute path route for delta catch-waters
router.post('/delta/catch/catch-waters', function (req, res) {
  req.session.data['waters'] = req.body['waters'];
  res.redirect('/delta/catch/export-journey');
});

router.post('../delta/progress', function (req, res) {
  req.session.data['waters'] = req.body['waters'];
  res.redirect('../delta/progress');
});

router.post('../delta/export-journey', function (req, res) {
  req.session.data['waters'] = req.body['waters'];
  res.redirect('../delta/export-journey');
});

// Route for delta catch transport-type
router.post('/delta/catch/transport/transport-type', function (req, res) {
  req.session.data['departure-country'] = req.body['departure-country'];
  req.session.data['destination-country'] = req.body['destination-country'];
  const transportType = req.body['transport-type'];

  if (transportType === 'Truck') {
    res.redirect('/delta/catch/transport/transport-truck');
  } else if (transportType === 'Plane') {
    res.redirect('/delta/catch/transport/transport-plane');
  } else if (transportType === 'Train') {
    res.redirect('/delta/catch/transport/transport-train');
  } else if (transportType === 'Container vessel') {
    res.redirect('/delta/catch/transport/transport-container-vessel');
  } else {
    res.redirect('/delta/catch/transport/transport-type');
  }
});

// POST routes for delta catch transport pages
router.post('/delta/catch/transport/transport-truck', function (req, res) {
  req.session.data['truck-nationality'] = req.body['truck-nationality'];
  req.session.data['truck-registration'] = req.body['registration-number'];
  req.session.data['export-place'] = req.body['export-place'];
  req.session.data['destination-point-truck'] = req.body['destination-point-truck'];
  req.session.data['freight-number'] = req.body['freight-number'];
  req.session.data['container-identification-truck'] = req.body['container-identification-truck'];
  req.session.data['transportTypes'] = req.session.data['transportTypes'] || [];
  req.session.data['transportTypes'].push({
    type: 'Truck',
    truckNationality: req.body['truck-nationality'],
    truckRegistration: req.body['registration-number'],
    exportPlace: req.body['export-place'],
    destinationPoint: req.body['destination-point-truck'],
    freightBillNumber: req.body['freight-number'],
    containerIdentification: req.body['container-identification-truck']
  });
  res.redirect('/delta/catch/transport/transport-documents');
});

router.post('/delta/catch/transport/transport-plane', function (req, res) {
  req.session.data['airway-bill'] = req.body['airway-bill'];
  req.session.data['flight-number'] = req.body['flight-number'];
  req.session.data['plane-departure'] = req.body['plane-departure'];
  req.session.data['destination-point-plane'] = req.body['destination-point-plane'];
  req.session.data['container-identification'] = req.body['container-identification'];
  req.session.data['transportTypes'] = req.session.data['transportTypes'] || [];
  req.session.data['transportTypes'].push({
    type: 'Plane',
    flightNumber: req.body['flight-number'],
    planeDeparture: req.body['plane-departure'],
    destinationPoint: req.body['destination-point-plane'],
    airwayBill: req.body['airway-bill'],
    containerIdentification: req.body['container-identification']
  });
  res.redirect('/delta/catch/transport/transport-documents-plane');
});

router.post('/delta/catch/transport/transport-train', function (req, res) {
  req.session.data['railway-bill'] = req.body['railway-bill'];
  req.session.data['train-departure'] = req.body['train-departure'];
  req.session.data['destination-point-train'] = req.body['destination-point-train'];
  req.session.data['freight-bill'] = req.body['freight-bill'];
  req.session.data['container-identification-train'] = req.body['container-identification-train'];
  req.session.data['transportTypes'] = req.session.data['transportTypes'] || [];
  req.session.data['transportTypes'].push({
    type: 'Train',
    railwayBill: req.body['railway-bill'],
    trainDeparture: req.body['train-departure'],
    destinationPoint: req.body['destination-point-train'],
    freightBillNumber: req.body['freight-bill'],
    containerIdentification: req.body['container-identification-train']
  });
  res.redirect('/delta/catch/transport/transport-documents-train');
});

router.post('/delta/catch/transport/transport-container-vessel', function (req, res) {
  req.session.data['vessel-name'] = req.body['vessel-name'];
  req.session.data['flag-state'] = req.body['flag-state'];
  req.session.data['container-vessel-departure'] = req.body['container-vessel-departure'];
  req.session.data['destination-point-vessel'] = req.body['destination-point-vessel'];
  req.session.data['freight-bill'] = req.body['freight-bill'];
  req.session.data['transportTypes'] = req.session.data['transportTypes'] || [];
  req.session.data['transportTypes'].push({
    type: 'Container vessel',
    vesselName: req.body['vessel-name'],
    flagState: req.body['flag-state'],
    containerVesselDeparture: req.body['container-vessel-departure'],
    destinationPoint: req.body['destination-point-vessel'],
    freightBillNumber: req.body['freight-bill']
  });
  res.redirect('/delta/catch/transport/transport-documents-vessel');
});

router.post('/delta/catch/transport/transport-documents', function (req, res) {
  let documentNames = req.session.data['documentName[]'] || [];
  let referenceNumbers = req.session.data['referenceNumber[]'] || [];
  const names = req.body['documentName[]'] || req.body.documentName;
  const refs = req.body['referenceNumber[]'] || req.body.referenceNumber;
  const editIndex = req.body.editIndex;
  if (editIndex !== undefined && editIndex !== '') {
    documentNames[editIndex] = names; referenceNumbers[editIndex] = refs;
  } else {
    if (Array.isArray(names)) { documentNames.push(...names); referenceNumbers.push(...refs); }
    else { documentNames.push(names); referenceNumbers.push(refs); }
  }
  req.session.data['documentName[]'] = documentNames;
  req.session.data['referenceNumber[]'] = referenceNumbers;
  res.redirect('/delta/catch/transport/transport-additional');
});

router.post('/delta/catch/transport/transport-documents-plane', function (req, res) {
  let documentNames = req.session.data['planeDocumentName[]'] || [];
  let referenceNumbers = req.session.data['planeReferenceNumber[]'] || [];
  const names = req.body['documentName[]'] || req.body.documentName;
  const refs = req.body['referenceNumber[]'] || req.body.referenceNumber;
  const editIndex = req.body.editIndex;
  if (editIndex !== undefined && editIndex !== '') {
    documentNames[editIndex] = names; referenceNumbers[editIndex] = refs;
  } else {
    if (Array.isArray(names)) { documentNames.push(...names); referenceNumbers.push(...refs); }
    else { documentNames.push(names); referenceNumbers.push(refs); }
  }
  req.session.data['planeDocumentName[]'] = documentNames;
  req.session.data['planeReferenceNumber[]'] = referenceNumbers;
  res.redirect('/delta/catch/transport/transport-additional');
});

router.post('/delta/catch/transport/transport-documents-train', function (req, res) {
  let documentNames = req.session.data['trainDocumentName[]'] || [];
  let referenceNumbers = req.session.data['trainReferenceNumber[]'] || [];
  const names = req.body['documentName[]'] || req.body.documentName;
  const refs = req.body['referenceNumber[]'] || req.body.referenceNumber;
  const editIndex = req.body.editIndex;
  if (editIndex !== undefined && editIndex !== '') {
    documentNames[editIndex] = names; referenceNumbers[editIndex] = refs;
  } else {
    if (Array.isArray(names)) { documentNames.push(...names); referenceNumbers.push(...refs); }
    else { documentNames.push(names); referenceNumbers.push(refs); }
  }
  req.session.data['trainDocumentName[]'] = documentNames;
  req.session.data['trainReferenceNumber[]'] = referenceNumbers;
  res.redirect('/delta/catch/transport/transport-additional');
});

router.post('/delta/catch/transport/transport-documents-vessel', function (req, res) {
  let documentNames = req.session.data['vesselDocumentName[]'] || [];
  let referenceNumbers = req.session.data['vesselReferenceNumber[]'] || [];
  const names = req.body['documentName[]'] || req.body.documentName;
  const refs = req.body['referenceNumber[]'] || req.body.referenceNumber;
  const editIndex = req.body.editIndex;
  if (editIndex !== undefined && editIndex !== '') {
    documentNames[editIndex] = names; referenceNumbers[editIndex] = refs;
  } else {
    if (Array.isArray(names)) { documentNames.push(...names); referenceNumbers.push(...refs); }
    else { documentNames.push(names); referenceNumbers.push(refs); }
  }
  req.session.data['vesselDocumentName[]'] = documentNames;
  req.session.data['vesselReferenceNumber[]'] = referenceNumbers;
  res.redirect('/delta/catch/transport/transport-additional');
});

router.post('/delta/catch/transport/transport-additional', function (req, res) {
  const removeIndex = req.body.removeIndex;
  if (removeIndex !== undefined && removeIndex !== '') {
    let transportTypes = req.session.data['transportTypes'] || [];
    const removed = transportTypes[removeIndex];
    const removedType = removed && removed.type;
    transportTypes.splice(removeIndex, 1);
    req.session.data['transportTypes'] = transportTypes;
    if (removedType === 'Truck') {
      let dn = req.session.data['documentName[]'] || [];
      let rn = req.session.data['referenceNumber[]'] || [];
      if (dn.length > removeIndex) dn.splice(removeIndex, 1);
      if (rn.length > removeIndex) rn.splice(removeIndex, 1);
      req.session.data['documentName[]'] = dn; req.session.data['referenceNumber[]'] = rn;
    } else if (removedType === 'Train') {
      let dn = req.session.data['trainDocumentName[]'] || [];
      let rn = req.session.data['trainReferenceNumber[]'] || [];
      if (dn.length > removeIndex) dn.splice(removeIndex, 1);
      if (rn.length > removeIndex) rn.splice(removeIndex, 1);
      req.session.data['trainDocumentName[]'] = dn; req.session.data['trainReferenceNumber[]'] = rn;
    } else if (removedType === 'Plane') {
      let dn = req.session.data['planeDocumentName[]'] || [];
      let rn = req.session.data['planeReferenceNumber[]'] || [];
      if (dn.length > removeIndex) dn.splice(removeIndex, 1);
      if (rn.length > removeIndex) rn.splice(removeIndex, 1);
      req.session.data['planeDocumentName[]'] = dn; req.session.data['planeReferenceNumber[]'] = rn;
    } else if (removedType === 'Container vessel') {
      let dn = req.session.data['vesselDocumentName[]'] || [];
      let rn = req.session.data['vesselReferenceNumber[]'] || [];
      if (dn.length > removeIndex) dn.splice(removeIndex, 1);
      if (rn.length > removeIndex) rn.splice(removeIndex, 1);
      req.session.data['vesselDocumentName[]'] = dn; req.session.data['vesselReferenceNumber[]'] = rn;
    }
    return res.redirect('/delta/catch/transport/transport-additional');
  }
  let documentNames = req.session.data['documentName[]'] || [];
  let referenceNumbers = req.session.data['referenceNumber[]'] || [];
  const name = req.body['documentName[]'];
  const ref = req.body['referenceNumber[]'];
  const editIndex = req.body.editIndex;
  if (editIndex !== undefined && editIndex !== '') {
    documentNames[editIndex] = name; referenceNumbers[editIndex] = ref;
  } else {
    if (Array.isArray(name)) { documentNames.push(...name); referenceNumbers.push(...ref); }
    else { documentNames.push(name); referenceNumbers.push(ref); }
  }
  req.session.data['documentName[]'] = documentNames;
  req.session.data['referenceNumber[]'] = referenceNumbers;
  req.session.data['additional-modes'] = req.body['additional-modes'];
  const additionalModes = req.body['additional-modes'];
  if (additionalModes === 'Yes') {
    res.redirect('/delta/catch/transport/transport-type');
  } else if (additionalModes === 'No') {
    res.redirect('/delta/catch/transport/check-your-answers');
  } else {
    res.redirect('/delta/catch/transport/transport-additional');
  }
});

router.get('/delta/catch/transport/check-your-answers', function (req, res) {
  res.render('delta/catch/transport/check-your-answers', { data: req.session.data });
});

// Route for delta catch progress from export-journey
router.post('/delta/catch/progress', function (req, res) {
  req.session.data['departure-country'] = req.body['departure-country'];
  req.session.data['destination-country'] = req.body['destination-country'];
  res.redirect('/delta/catch/progress');
});

// Route for plane transport

router.post('../delta/progress', function (req, res) {
  req.session.data['departure-country'] = req.body['departure-country'];
  req.session.data['destination-country'] = req.body['destination-country'];
  res.redirect('../delta/progress');
});

router.post('../delta/transport/transport-type', function (req, res) {
  req.session.data['departure-country'] = req.body['departure-country'];
  req.session.data['destination-country'] = req.body['destination-country'];
  res.redirect('../delta/transport/transport-type');
});

router.post('../delta/progress', function (req, res) {
  req.session.data['airway-bill'] = req.body['airway-bill'];
  req.session.data['flight-number'] = req.body['flight-number'];
  req.session.data['plane-departure'] = req.body['plane-departure'];
  req.session.data['container-identification'] = req.body['container-identification']; // single value
  req.session.data['freight-bill'] = req.body['freight-bill'];
  res.redirect('../delta/progress');
});

router.post('../delta/transport/transport-documents-plane', function (req, res) {
  req.session.data['airway-bill'] = req.body['airway-bill'];
  req.session.data['flight-number'] = req.body['flight-number'];
  req.session.data['plane-departure'] = req.body['plane-departure'];
  req.session.data['container-identification'] = req.body['container-identification']; // single value
  req.session.data['freight-bill'] = req.body['freight-bill'];
  res.redirect('../delta/transport/transport-documents-plane');
});

router.post('../delta/transport/check-your-answers', function (req, res) {
  // You could log, save, or simulate submission here
  console.log('Final submission:', req.session.data);

  // Redirect to a confirmation page
  res.redirect('../delta/catch-certificate-complete');
});

router.get('../gamma/catch-certificate-complete', function (req, res) {
  res.render('../gamma/catch-certificate-complete');
});

// Add your routes here
// Route for displaying the 'Check your answers' page
router.get('/poc/transport/check-your-answers', function (req, res) {
  const data = req.session.data;
  const groupedTransportTypes = getGroupedTransportTypes(data);
  res.render('poc/transport/check-your-answers', {
    data,
    groupedTransportTypes
  });
});


// Route for handling transport selection
router.post('/poc/transport/transport-type', function (req, res) {
  const transportType = req.body['transport-type'];

  if (transportType === 'Truck') {
    res.redirect('/poc/transport/transport-truck');
  } else if (transportType === 'Plane') {
    res.redirect('/poc/transport/transport-plane');
  } else if (transportType === 'Train') {
    res.redirect('/poc/transport/transport-train');
  } else if (transportType === 'Container vessel') {
    res.redirect('/poc/transport/transport-container-vessel');
  } else {
    res.redirect('/poc/transport/transport-type');  // Redirect back if no option selected

  }
});


// Route for handling truck transport
router.post('/poc/transport/transport-truck', function (req, res) {
  req.session.data['truck-nationality'] = req.body['truck-nationality'];
  req.session.data['truck-registration'] = req.body['registration-number'];
  req.session.data['export-place'] = req.body['export-place'];
  req.session.data['freight-number'] = req.body['freight-number'];

  // Add to transportTypes array in session
  req.session.data['transportTypes'] = req.session.data['transportTypes'] || [];
  req.session.data['transportTypes'].push({
    type: 'Truck',
    truckNationality: req.body['truck-nationality'],
    truckRegistration: req.body['registration-number'],
    exportPlace: req.body['export-place'],
    freightBillNumber: req.body['freight-number']
  });
  res.redirect('/poc/transport/transport-documents');
});

// Route for handling plane transport
router.post('/poc/transport/transport-plane', function (req, res) {
  req.session.data['airway-bill'] = req.body['airway-bill'];
  req.session.data['flight-number'] = req.body['flight-number'];
  req.session.data['plane-departure'] = req.body['plane-departure'];
  req.session.data['container-identification'] = req.body['container-identification'];

  req.session.data['transportTypes'] = req.session.data['transportTypes'] || [];
  req.session.data['transportTypes'].push({
    type: 'Plane',
    flightNumber: req.body['flight-number'],
    planeDeparture: req.body['plane-departure'],
    airwayBill: req.body['airway-bill'],
    containerIdentification: req.body['container-identification']
  });
  res.redirect('/poc/transport/transport-documents-plane');
});

// Route for handling train transport
router.post('/poc/transport/transport-train', function (req, res) {
  req.session.data['railway-bill'] = req.body['railway-bill'];
  req.session.data['train-departure'] = req.body['train-departure'];
  req.session.data['freight-bill'] = req.body['freight-bill'];

  req.session.data['transportTypes'] = req.session.data['transportTypes'] || [];
  req.session.data['transportTypes'].push({
    type: 'Train',
    railwayBill: req.body['railway-bill'],
    trainDeparture: req.body['train-departure'],
    freightBillNumber: req.body['freight-bill']
  });
  res.redirect('/poc/transport/transport-documents-train');
});

// Route for handling container vessel transport
router.post('/poc/transport/transport-container-vessel', function (req, res) {
  req.session.data['vessel-name'] = req.body['vessel-name'];
  req.session.data['flag-state'] = req.body['flag-state'];
  req.session.data['container-vessel-departure'] = req.body['container-vessel-departure'];
  req.session.data['freight-bill'] = req.body['freight-bill'];

  req.session.data['transportTypes'] = req.session.data['transportTypes'] || [];
  req.session.data['transportTypes'].push({
    type: 'Container vessel',
    vesselName: req.body['vessel-name'],
    flagState: req.body['flag-state'],
    containerVesselDeparture: req.body['container-vessel-departure'],
    freightBillNumber: req.body['freight-bill']
  });
  res.redirect('/poc/transport/transport-documents-vessel');
});


router.get('/poc/transport/transport-documents', function (req, res) {
  const editIndex = req.query.edit;
  const removeIndex = req.query.remove;

  let documentNames = req.session.data['documentName[]'] || [];
  let referenceNumbers = req.session.data['referenceNumber[]'] || [];

  // Handle removal
  if (removeIndex !== undefined) {
    documentNames.splice(removeIndex, 1);
    referenceNumbers.splice(removeIndex, 1);
    req.session.data['documentName[]'] = documentNames;
    req.session.data['referenceNumber[]'] = referenceNumbers;
    return res.redirect('/poc/transport/transport-additional');
  }

  // Handle editing
  if (editIndex !== undefined) {
    res.render('poc/transport/transport-documents', {
      data: req.session.data,
      editIndex: editIndex,
      editDocumentName: documentNames[editIndex],
      editReferenceNumber: referenceNumbers[editIndex]
    });
  } else {
    res.render('poc/transport/transport-documents', {
      data: req.session.data
    });
  }
});



router.post('/poc/transport/transport-additional', function (req, res) {
  // Handle removal of a transport row
  const removeIndex = req.body.removeIndex;
  if (removeIndex !== undefined && removeIndex !== '') {
    let transportTypes = req.session.data['transportTypes'] || [];
    // Get the type of the transport being removed
    const removed = transportTypes[removeIndex];
    const removedType = removed && removed.type;
    transportTypes.splice(removeIndex, 1);
    req.session.data['transportTypes'] = transportTypes;
    // Only remove from the relevant document/reference arrays for the removed type
    if (removedType === 'Truck') {
      let documentNames = req.session.data['documentName[]'] || [];
      let referenceNumbers = req.session.data['referenceNumber[]'] || [];
      if (documentNames.length > removeIndex) documentNames.splice(removeIndex, 1);
      if (referenceNumbers.length > removeIndex) referenceNumbers.splice(removeIndex, 1);
      req.session.data['documentName[]'] = documentNames;
      req.session.data['referenceNumber[]'] = referenceNumbers;
    } else if (removedType === 'Train') {
      let trainDocumentNames = req.session.data['trainDocumentName[]'] || [];
      let trainReferenceNumbers = req.session.data['trainReferenceNumber[]'] || [];
      if (trainDocumentNames.length > removeIndex) trainDocumentNames.splice(removeIndex, 1);
      if (trainReferenceNumbers.length > removeIndex) trainReferenceNumbers.splice(removeIndex, 1);
      req.session.data['trainDocumentName[]'] = trainDocumentNames;
      req.session.data['trainReferenceNumber[]'] = trainReferenceNumbers;
    } else if (removedType === 'Plane') {
      let planeDocumentNames = req.session.data['planeDocumentName[]'] || [];
      let planeReferenceNumbers = req.session.data['planeReferenceNumber[]'] || [];
      if (planeDocumentNames.length > removeIndex) planeDocumentNames.splice(removeIndex, 1);
      if (planeReferenceNumbers.length > removeIndex) planeReferenceNumbers.splice(removeIndex, 1);
      req.session.data['planeDocumentName[]'] = planeDocumentNames;
      req.session.data['planeReferenceNumber[]'] = planeReferenceNumbers;
    } else if (removedType === 'Container vessel') {
      let vesselDocumentNames = req.session.data['vesselDocumentName[]'] || [];
      let vesselReferenceNumbers = req.session.data['vesselReferenceNumber[]'] || [];
      if (vesselDocumentNames.length > removeIndex) vesselDocumentNames.splice(removeIndex, 1);
      if (vesselReferenceNumbers.length > removeIndex) vesselReferenceNumbers.splice(removeIndex, 1);
      req.session.data['vesselDocumentName[]'] = vesselDocumentNames;
      req.session.data['vesselReferenceNumber[]'] = vesselReferenceNumbers;
    }
    return res.redirect('/poc/transport/transport-additional');
  }
  let documentNames = req.session.data['documentName[]'] || [];
  let referenceNumbers = req.session.data['referenceNumber[]'] || [];

  const name = req.body['documentName[]'];
  const ref = req.body['referenceNumber[]'];
  const editIndex = req.body.editIndex;

  if (editIndex !== undefined && editIndex !== '') {
    documentNames[editIndex] = name;
    referenceNumbers[editIndex] = ref;
  } else {
    if (Array.isArray(name)) {
      documentNames.push(...name);
      referenceNumbers.push(...ref);
    } else {
      documentNames.push(name);
      referenceNumbers.push(ref);
    }
  }

  req.session.data['documentName[]'] = documentNames;
  req.session.data['referenceNumber[]'] = referenceNumbers;
  req.session.data['additional-modes'] = req.body['additional-modes'];

  const additionalModes = req.body['additional-modes'];
  if (additionalModes === 'Yes') {
    res.redirect('/poc/transport/transport-type');
  } else if (additionalModes === 'No') {
    res.redirect('/poc/progress-complete');
  } else {
    res.redirect('/poc/transport/transport-additional');
  }
});




// Route for exporter details
router.post('../poc/add-products', function (req, res) {
  req.session.data['exporter-name'] = req.body['exporter-name']
  req.session.data['company-name'] = req.body['exporter-name']
  // Add more fields as needed
  res.redirect('../poc/add-products')
})



// Route for landing details
router.post('../poc/add-landings', function (req, res) {
  const session = req.session.data;

  // Save form fields to session
  session['startDateDay'] = req.body['startDateDay'];
  session['startDateMonth'] = req.body['startDateMonth'];
  session['startDateYear'] = req.body['startDateYear'];

  session['day'] = req.body['dateLandedDay'];
  session['month'] = req.body['dateLandedMonth'];
  session['year'] = req.body['dateLandedYear'];

  session['faoArea'] = req.body['faoArea'];
  session['highSeas'] = req.body['highSeas'];
  session['eez'] = req.body['eez'];
  session['rfmo'] = req.body['rfmo'];
  session['vessel'] = req.body['vessel'];
  session['weight'] = req.body['weight'];
  session['gear1'] = req.body['gear1'];
  session['gear2'] = req.body['gear2'];

  // Redirect to the next step
  res.redirect('../poc/catch-waters');
});


// Route for export journey


router.post('../poc/catch-waters', function (req, res) {
  req.session.data['waters'] = req.body['waters']; // This will be an array if multiple checkboxes are selected
  res.redirect('../poc/export-journey');
});

router.post('../poc/progress', function (req, res) {
  req.session.data['waters'] = req.body['waters'];
  res.redirect('../poc/progress');
});

router.post('../poc/export-journey', function (req, res) {
  req.session.data['waters'] = req.body['waters'];
  res.redirect('../poc/export-journey');
});

// Route for plane transport

router.post('../poc/progress', function (req, res) {
  req.session.data['departure-country'] = req.body['departure-country'];
  req.session.data['destination-country'] = req.body['destination-country'];
  res.redirect('../poc/progress');
});

router.post('../poc/transport/transport-type', function (req, res) {
  req.session.data['departure-country'] = req.body['departure-country'];
  req.session.data['destination-country'] = req.body['destination-country'];
  res.redirect('../poc/transport/transport-type');
});

router.post('../poc/progress', function (req, res) {
  req.session.data['airway-bill'] = req.body['airway-bill'];
  req.session.data['flight-number'] = req.body['flight-number'];
  req.session.data['plane-departure'] = req.body['plane-departure'];
  req.session.data['container-identification'] = req.body['container-identification']; // single value
  req.session.data['freight-bill'] = req.body['freight-bill'];
  res.redirect('../poc/progress');
});

router.post('../poc/transport/transport-documents-plane', function (req, res) {
  req.session.data['airway-bill'] = req.body['airway-bill'];
  req.session.data['flight-number'] = req.body['flight-number'];
  req.session.data['plane-departure'] = req.body['plane-departure'];
  req.session.data['container-identification'] = req.body['container-identification']; // single value
  req.session.data['freight-bill'] = req.body['freight-bill'];
  res.redirect('../poc/transport/transport-documents-plane');
});

router.post('../poc/transport/check-your-answers', function (req, res) {
  // You could log, save, or simulate submission here
  console.log('Final submission:', req.session.data);

  // Redirect to a confirmation page
  res.redirect('../poc/catch-certificate-complete');
});

router.get('../poc/catch-certificate-complete', function (req, res) {
  res.render('../poc/catch-certificate-complete');
});

// Helper function to group transport types and attach document arrays
function getGroupedTransportTypes(data) {
  const grouped = {};
  const types = data['transportTypes'] || [];
  types.forEach((t, idx) => {
    // Only attach document arrays to the first entry of each type
    const isFirstOfType = idx === types.findIndex(e => e.type === t.type);
    const entry = { ...t, _originalIndex: idx };
    if (isFirstOfType) {
      if (t.type === 'Truck') {
        entry.documentName = data['documentName[]'] || [];
        entry.referenceNumber = data['referenceNumber[]'] || [];
      } else if (t.type === 'Train') {
        entry.documentName = data['trainDocumentName[]'] || [];
        entry.referenceNumber = data['trainReferenceNumber[]'] || [];
      } else if (t.type === 'Plane') {
        entry.documentName = data['planeDocumentName[]'] || [];
        entry.referenceNumber = data['planeReferenceNumber[]'] || [];
      } else if (t.type === 'Container vessel') {
        entry.documentName = data['vesselDocumentName[]'] || [];
        entry.referenceNumber = data['vesselReferenceNumber[]'] || [];
      }
    } else {
      entry.documentName = [];
      entry.referenceNumber = [];
    }
    if (!grouped[t.type]) grouped[t.type] = [];
    grouped[t.type].push(entry);
  });
  // Remove duplicate document/reference display: only keep docs/refs on first entry of each type
  Object.keys(grouped).forEach(type => {
    grouped[type].forEach((entry, i) => {
      if (i > 0) {
        entry.documentName = [];
        entry.referenceNumber = [];
      }
    });
  });
  return grouped;
}

// Update GET for check-your-answers
router.get('/delta/transport/check-your-answers', function (req, res) {
  const data = req.session.data;
  const groupedTransportTypes = getGroupedTransportTypes(data);
  res.render('delta/transport/check-your-answers', {
    data,
    groupedTransportTypes
  });
});

// Update GET for transport-additional
router.get('/delta/transport/transport-additional', function (req, res) {
  const data = req.session.data;
  const groupedTransportTypes = getGroupedTransportTypes(data);
  res.render('delta/transport/transport-additional', {
    data,
    groupedTransportTypes
  });
});

//Routes for non-manipulation document (nmd)

// Route for handling the 'Your reference' page
router.post('/delta/nmd/your-reference', function (req, res) {
  req.session.data['your-reference'] = req.body['your-reference'];
  // Add more fields as needed

  // Redirect based on which button was pressed
  if (req.body._action === 'progress' || req.body['formaction'] === 'progress') {
    res.redirect('/delta/nmd/progress');
  } else {
    res.redirect('/delta/nmd/exporter-details');
  }
});

// Route for exporter details
router.post('/delta/nmd/exporter-details', function (req, res) {
  req.session.data['company-name'] = req.body['company-name']
  // Add more fields as needed
  res.redirect('/delta/nmd/uk-document')
})

// Route for uk document details
router.post('/delta/nmd/uk-document', function (req, res) {
  req.session.data['uk-document'] = req.body['uk-document'];

  const issuedInUK = req.body['uk-document'];

  if (issuedInUK === 'Yes') {
    res.redirect('/delta/nmd/confirm-uk-document');
  } else if (issuedInUK === 'No') {
    res.redirect('/delta/nmd/confirm-uk-document-2');
  } else {
    res.redirect('/delta/nmd/uk-document'); // fallback if nothing selected
  }
});


// Route for uk document confirmation
router.post('/delta/nmd/confirm-uk-document', function (req, res) {
  req.session.data['entry-document-reference'] = req.body['entry-document-reference']
  // Add more fields as needed
  res.redirect('/delta/nmd/product-details')
});

// Route for uk document confirmation for third country
router.post('/delta/nmd/confirm-uk-document-2', function (req, res) {
  req.session.data['entry-document-reference-2'] = req.body['entry-document-reference-2']
  // Add more fields as needed
  res.redirect('/delta/nmd/product-details')
});


// Route for product details
router.post('/delta/nmd/product-details', function (req, res) {
const newEntry = {
  species: req.body['species'],
  commodityCode: req.body['commodity-code'],
  description: req.body['description'],
  referenceNumber: req.session.data['entry-document-reference'], // ✅ copy from top-level
  productReferenceNumber: req.body['productReferenceNumber'],
  netWeight: req.body['net-weight'],
  fishWeight: req.body['fish-weight']
};


  if (!req.session.data['productEntries']) {
    req.session.data['productEntries'] = [];
  }

  const editIndex = req.session.data['editIndex'];

  if (typeof editIndex !== 'undefined') {
    req.session.data['productEntries'][editIndex] = newEntry;
    delete req.session.data['editIndex'];
  } else {
    req.session.data['productEntries'].push(newEntry);
  }

  // Clear fields
  req.session.data['species'] = '';
  req.session.data['commodity-code'] = '';
  req.session.data['description'] = '';
  req.session.data['productReferenceNumber'] = '';
  req.session.data['net-weight'] = '';
  req.session.data['fish-weight'] = '';

  res.redirect('/delta/nmd/product-summary');
});



// Route for product summary
router.post('/delta/nmd/product-summary', function (req, res) {


  // Clear single-entry fields
  req.session.data['species'] = '';
  req.session.data['commodity-code'] = '';
  req.session.data['description'] = '';
  req.session.data['productReferenceNumber'] = '';
  req.session.data['net-weight'] = '';
  req.session.data['fish-weight'] = '';

  req.session.data['more-products'] = req.body['more-products'];

  const productEntries = req.body['more-products'];

  if (productEntries === 'Yes') {
    res.redirect('/delta/nmd/uk-document');
  } else if (productEntries === 'No') {
    res.redirect('/delta/nmd/transport-type');
  } else {
    // ✅ Render the summary page directly if no selection
    res.render('product-summary', {
      data: {
        productEntries: req.session.data['productEntries']
      }
    });
  }
});

router.get('/delta/nmd/remove-product/:index', function (req, res) {
  const index = parseInt(req.params.index);
  if (!isNaN(index) && req.session.data['productEntries']) {
    req.session.data['productEntries'].splice(index, 1);
  }
  res.redirect('/delta/nmd/product-summary');
});


router.get('/delta/nmd/edit-product/:index', function (req, res) {
  const index = parseInt(req.params.index);
  const product = req.session.data['productEntries'][index];

  // Pre-fill session fields with selected product
  req.session.data['species'] = product.species;
  req.session.data['commodity-code'] = product.commodityCode;
  req.session.data['description'] = product.description;
  req.session.data['entry-document-reference'] = product.referenceNumber;
  req.session.data['productReferenceNumber'] = product.productReferenceNumber;
  req.session.data['net-weight'] = product.netWeight;
  req.session.data['fish-weight'] = product.fishWeight;

  // Store index for update later
  req.session.data['editIndex'] = index;

  res.redirect('/delta/nmd/product-details');
});



// Route for handling transport selection
router.post('/delta/nmd/transport-type', function (req, res) {
  const transportType = req.body['transport-type'];

  if (transportType === 'Truck') {
    res.redirect('/delta/nmd/transport-truck');
  } else if (transportType === 'Plane') {
    res.redirect('/delta/nmd/transport-plane');
  } else if (transportType === 'Train') {
    res.redirect('/delta/nmd/transport-train');
  } else if (transportType === 'Container vessel') {
    res.redirect('/delta/nmd/transport-container-vessel');
  } else {
    res.redirect('/delta/nmd/transport-type');  // Redirect back if no option selected

  }
});

// Route for handling truck transport
router.post('/delta/nmd/transport-truck', function (req, res) {
  req.session.data['truck-nationality'] = req.body['truck-nationality'];
  req.session.data['truck-registration'] = req.body['registration-number'];
  req.session.data['export-place'] = req.body['export-place'];
  req.session.data['freight-number'] = req.body['freight-number'];

  // Add to transportTypes array in session
  req.session.data['transportTypes'] = req.session.data['transportTypes'] || [];
  req.session.data['transportTypes'].push({
    type: 'Truck',
    truckNationality: req.body['truck-nationality'],
    truckRegistration: req.body['registration-number'],
    exportPlace: req.body['export-place'],
    freightBillNumber: req.body['freight-number']
  });
  res.redirect('/delta/nmd/transport-documents');
});

// Route for handling plane transport
router.post('/delta/nmd/transport-plane', function (req, res) {
  req.session.data['airway-bill'] = req.body['airway-bill'];
  req.session.data['flight-number'] = req.body['flight-number'];
  req.session.data['plane-departure'] = req.body['plane-departure'];
  req.session.data['container-identification'] = req.body['container-identification'];

  req.session.data['transportTypes'] = req.session.data['transportTypes'] || [];
  req.session.data['transportTypes'].push({
    type: 'Plane',
    flightNumber: req.body['flight-number'],
    planeDeparture: req.body['plane-departure'],
    airwayBill: req.body['airway-bill'],
    containerIdentification: req.body['container-identification']
  });
  res.redirect('/delta/nmd/transport-documents-plane');
});

// Route for handling train transport
router.post('/delta/nmd/transport-train', function (req, res) {
  req.session.data['railway-bill'] = req.body['railway-bill'];
  req.session.data['train-departure'] = req.body['train-departure'];
  req.session.data['freight-bill'] = req.body['freight-bill'];

  req.session.data['transportTypes'] = req.session.data['transportTypes'] || [];
  req.session.data['transportTypes'].push({
    type: 'Train',
    railwayBill: req.body['railway-bill'],
    trainDeparture: req.body['train-departure'],
    freightBillNumber: req.body['freight-bill']
  });
  res.redirect('/delta/nmd/transport-documents-train');
});

// Route for handling container vessel transport
router.post('/delta/nmd/transport-container-vessel', function (req, res) {
  req.session.data['vessel-name'] = req.body['vessel-name'];
  req.session.data['flag-state'] = req.body['flag-state'];
  req.session.data['container-vessel-departure'] = req.body['container-vessel-departure'];
  req.session.data['freight-bill'] = req.body['freight-bill'];

  req.session.data['transportTypes'] = req.session.data['transportTypes'] || [];
  req.session.data['transportTypes'].push({
    type: 'Container vessel',
    vesselName: req.body['vessel-name'],
    flagState: req.body['flag-state'],
    containerVesselDeparture: req.body['container-vessel-departure'],
    freightBillNumber: req.body['freight-bill']
  });
  res.redirect('/delta/nmd/transport-documents-vessel');
});


// TRUCK DOCUMENTS
router.post('/delta/nmd/transport-documents', function (req, res) {
  let documentNames = req.session.data['documentName[]'] || [];
  let referenceNumbers = req.session.data['referenceNumber[]'] || [];

  const names = req.body['documentName[]'] || req.body.documentName;
  const refs = req.body['referenceNumber[]'] || req.body.referenceNumber;
  const editIndex = req.body.editIndex;

  if (editIndex !== undefined && editIndex !== '') {
    documentNames[editIndex] = names;
    referenceNumbers[editIndex] = refs;
  } else {
    if (Array.isArray(names)) {
      documentNames.push(...names);
      referenceNumbers.push(...refs);
    } else {
      documentNames.push(names);
      referenceNumbers.push(refs);
    }
  }

  req.session.data['documentName[]'] = documentNames;
  req.session.data['referenceNumber[]'] = referenceNumbers;

  res.redirect('/delta/nmd/arrival-details');
});

// TRAIN DOCUMENTS
router.post('/delta/nmd/transport-documents-train', function (req, res) {
  let documentNames = req.session.data['trainDocumentName[]'] || [];
  let referenceNumbers = req.session.data['trainReferenceNumber[]'] || [];

  const names = req.body['documentName[]'] || req.body.documentName;
  const refs = req.body['referenceNumber[]'] || req.body.referenceNumber;
  const editIndex = req.body.editIndex;

  if (editIndex !== undefined && editIndex !== '') {
    documentNames[editIndex] = names;
    referenceNumbers[editIndex] = refs;
  } else {
    if (Array.isArray(names)) {
      documentNames.push(...names);
      referenceNumbers.push(...refs);
    } else {
      documentNames.push(names);
      referenceNumbers.push(refs);
    }
  }

  req.session.data['trainDocumentName[]'] = documentNames;
  req.session.data['trainReferenceNumber[]'] = referenceNumbers;

  res.redirect('/delta/nmd/arrival-details');
});

// PLANE DOCUMENTS
router.post('/delta/nmd/transport-documents-plane', function (req, res) {
  let documentNames = req.session.data['planeDocumentName[]'] || [];
  let referenceNumbers = req.session.data['planeReferenceNumber[]'] || [];

  const names = req.body['documentName[]'] || req.body.documentName;
  const refs = req.body['referenceNumber[]'] || req.body.referenceNumber;
  const editIndex = req.body.editIndex;

  if (editIndex !== undefined && editIndex !== '') {
    documentNames[editIndex] = names;
    referenceNumbers[editIndex] = refs;
  } else {
    if (Array.isArray(names)) {
      documentNames.push(...names);
      referenceNumbers.push(...refs);
    } else {
      documentNames.push(names);
      referenceNumbers.push(refs);
    }
  }

  req.session.data['planeDocumentName[]'] = documentNames;
  req.session.data['planeReferenceNumber[]'] = referenceNumbers;

  res.redirect('/delta/nmd/arrival-details');
});

// VESSEL DOCUMENTS
router.post('/delta/nmd/transport-documents-vessel', function (req, res) {
  let documentNames = req.session.data['vesselDocumentName[]'] || [];
  let referenceNumbers = req.session.data['vesselReferenceNumber[]'] || [];

  const names = req.body['documentName[]'] || req.body.documentName;
  const refs = req.body['referenceNumber[]'] || req.body.referenceNumber;
  const editIndex = req.body.editIndex;

  if (editIndex !== undefined && editIndex !== '') {
    documentNames[editIndex] = names;
    referenceNumbers[editIndex] = refs;
  } else {
    if (Array.isArray(names)) {
      documentNames.push(...names);
      referenceNumbers.push(...refs);
    } else {
      documentNames.push(names);
      referenceNumbers.push(refs);
    }
  }

  req.session.data['vesselDocumentName[]'] = documentNames;
  req.session.data['vesselReferenceNumber[]'] = referenceNumbers;

  res.redirect('/delta/nmd/arrival-details');
});

// Route for handling the storage facility arrival page
router.post('/delta/nmd/arrival-details', function (req, res) {
  req.session.data['departure-country'] = req.body['departure-country'];
    req.session.data['departure-location'] = req.body['departure-location'];
      req.session.data['storage-location'] = req.body['storage-location'];

      // Combine departure date
const departureDay = req.body['departure-date-day'];
const departureMonth = req.body['departure-date-month'];
const departureYear = req.body['departure-date-year'];
req.session.data['departure-date'] = `${departureDay}/${departureMonth}/${departureYear}`;

// Combine arrival date
const arrivalDay = req.body['arrival-date-day'];
const arrivalMonth = req.body['arrival-date-month']; // fix typo in HTML
const arrivalYear = req.body['arrival-date-year'];
req.session.data['arrival-date'] = `${arrivalDay}/${arrivalMonth}/${arrivalYear}`;

  // Add more fields as needed

  // Redirect based on which button was pressed
  if (req.body._action === 'progress' || req.body['formaction'] === 'progress') {
    res.redirect('/delta/nmd/progress');
  } else {
    res.redirect('/delta/nmd/storage-facility-details');
  }
});

// Route for storage facility details
router.post('/delta/nmd/storage-facility-details', function (req, res) {
  req.session.data['facility-name'] = req.body['facility-name'];
  // Add more fields as needed
  res.redirect('/delta/nmd/storage-facility-address');
});

// Route for storage facility details
router.post('/delta/nmd/storage-facility-address', function (req, res) {
  req.session.data['postcode'] = req.body['postcode'];
  // Add more fields as needed
  res.redirect('/delta/nmd/storage-facility-address-2');
});

// Route for storage facility address
router.post('/delta/nmd/storage-facility-address-2', function (req, res) {
  req.session.data['building-number'] = req.body['building-number'];
  req.session.data['building-name'] = req.body['building-name'];
  req.session.data['sub-building-name'] = req.body['sub-building-name'];
  req.session.data['street-name'] = req.body['street-name'];
  req.session.data['county'] = req.body['county'];
  req.session.data['country'] = req.body['country'];
  // Add more fields as needed
  res.redirect('/delta/nmd/storage-facility-confirmation');
});

// Route for storage facility confirmation
router.post('/delta/nmd/storage-facility-confirmation', function (req, res) {
  
  // Add more fields as needed
  res.redirect('/delta/nmd/storage-facility-approval');
});


// Route for storage facility approval
// Route for storage facility approval
router.post('/delta/nmd/storage-facility-approval', function (req, res) {
  let storageTypes = [].concat(req.body['product-storage'] || []);
  storageTypes = storageTypes.filter(item => item !== '_unchecked');
  req.session.data['product-storage'] = storageTypes;
  res.redirect('/delta/nmd/storage-facility-summary');
});



// Route for storage facility summary
router.post('/delta/nmd/storage-facility-summary', function (req, res) {
  // Get current values from session
  const facilityName = req.session.data['facility-name'];
  const addAnother = req.body['storage-facility']; // Yes or No

  // Create a new facility entry
  const newFacility = {
    name: facilityName,
  };

  // Save to session array
  if (!req.session.data['storageFacilities']) {
    req.session.data['storageFacilities'] = [];
  }

  req.session.data['storageFacilities'].push(newFacility);

  // Redirect based on user choice
  if (addAnother === 'Yes') {
    res.redirect('/delta/nmd/storage-facility-details');
  } else if (addAnother === 'No') {
    res.redirect('/delta/nmd/departure-summary');
  } else {
    res.redirect('/delta/nmd/storage-facility-summary');
  }
});

// Route for departure details
router.post('/delta/nmd/departure-details', function (req, res) {
  // Capture date parts
  const day = req.body['departure-date-uk-day'];
  const month = req.body['departure-date-uk-month'];
  const year = req.body['departure-date-uk-year'];

  // Combine into a single date string (optional formatting)
  const departureDate = `${day}/${month}/${year}`;
  req.session.data['departure-date-uk'] = departureDate;

  // Capture departure location
  req.session.data['departure-location-uk'] = req.body['departure-location-uk'];

  // Redirect to the next step
  res.redirect('/delta/nmd/departure-destination');
});


// Route for departure summary
router.post('/delta/nmd/departure-summary', function (req, res) {
  const productEntries = req.session.data['productEntries'];

  if (productEntries && Array.isArray(productEntries)) {
    productEntries.forEach((entry, index) => {
      const netWeightKey = `departure-net-weight-${index}`;
      const fishWeightKey = `departure-fish-weight-${index}`;

      entry.departureNetWeight = req.body[netWeightKey];
      entry.departureFishWeight = req.body[fishWeightKey];
    });
  }

  res.redirect('/delta/nmd/departure-details');
});


// Route for consignment destination
router.post('/delta/nmd/departure-destination', function (req, res) {
  // Capture the destination country
  const destinationCountry = req.body['departure-destination-country'];

  // Save to session
  req.session.data['departure-destination-country'] = destinationCountry;

  // Redirect to the next step in the journey
  res.redirect('/delta/nmd/departure-transport-type');
});

router.post('/delta/nmd/departure-transport-type', function (req, res) {
  const transportType = req.body['departure-transport-type'];

  if (transportType === 'Truck') {
    res.redirect('/delta/nmd/departure-transport-truck');
  } else if (transportType === 'Plane') {
    res.redirect('/delta/nmd/departure-transport-plane');
  } else if (transportType === 'Train') {
    res.redirect('/delta/nmd/departure-transport-train');
  } else if (transportType === 'Container vessel') {
    res.redirect('/delta/nmd/departure-transport-container-vessel');
  } else {
    res.redirect('/delta/nmd/departure-transport-type');
  }
});

router.post('/delta/nmd/departure-transport-truck', function (req, res) {
  req.session.data['departure-truck-nationality'] = req.body['truck-nationality'];
  req.session.data['departure-truck-registration'] = req.body['registration-number'];
  req.session.data['departure-export-place'] = req.body['export-place'];
  req.session.data['departure-freight-number'] = req.body['freight-number'];

  res.redirect('/delta/nmd/departure-transport-documents');
});

router.post('/delta/nmd/departure-transport-plane', function (req, res) {
  req.session.data['departure-airway-bill'] = req.body['airway-bill'];
  req.session.data['departure-flight-number'] = req.body['flight-number'];
  req.session.data['departure-plane-departure'] = req.body['plane-departure'];
  req.session.data['departure-container-identification'] = req.body['container-identification'];

  res.redirect('/delta/nmd/departure-transport-documents-plane');
});

router.post('/delta/nmd/departure-transport-train', function (req, res) {
  req.session.data['departure-railway-bill'] = req.body['railway-bill'];
  req.session.data['departure-train-departure'] = req.body['train-departure'];
  req.session.data['departure-freight-bill'] = req.body['freight-bill'];

  res.redirect('/delta/nmd/departure-transport-documents-train');
});

router.post('/delta/nmd/departure-transport-container-vessel', function (req, res) {
  req.session.data['departure-vessel-name'] = req.body['vessel-name'];
  req.session.data['departure-flag-state'] = req.body['flag-state'];
  req.session.data['departure-container-vessel-departure'] = req.body['container-vessel-departure'];
  req.session.data['departure-freight-bill'] = req.body['departure-freight-bill'];

  res.redirect('/delta/nmd/departure-transport-documents-vessel');
});

router.post('/delta/nmd/departure-transport-documents', function (req, res) {
  let documentNames = req.session.data['departure-documentName[]'] || [];
  let referenceNumbers = req.session.data['departure-referenceNumber[]'] || [];

  const names = req.body['documentName[]'] || req.body.documentName;
  const refs = req.body['referenceNumber[]'] || req.body.referenceNumber;
  const editIndex = req.body.editIndex;

  if (editIndex !== undefined && editIndex !== '') {
    documentNames[editIndex] = names;
    referenceNumbers[editIndex] = refs;
  } else {
    if (Array.isArray(names)) {
      documentNames.push(...names);
      referenceNumbers.push(...refs);
    } else {
      documentNames.push(names);
      referenceNumbers.push(refs);
    }
  }

  req.session.data['departure-documentName[]'] = documentNames;
  req.session.data['departure-referenceNumber[]'] = referenceNumbers;

  res.redirect('/delta/nmd/progress');
});

router.post('/delta/nmd/departure-transport-documents-plane', function (req, res) {
  let documentNames = req.session.data['departure-planeDocumentName[]'] || [];
  let referenceNumbers = req.session.data['departure-planeReferenceNumber[]'] || [];

  const names = req.body['documentName[]'] || req.body.documentName;
  const refs = req.body['referenceNumber[]'] || req.body.referenceNumber;
  const editIndex = req.body.editIndex;

  if (editIndex !== undefined && editIndex !== '') {
    documentNames[editIndex] = names;
    referenceNumbers[editIndex] = refs;
  } else {
    if (Array.isArray(names)) {
      documentNames.push(...names);
      referenceNumbers.push(...refs);
    } else {
      documentNames.push(names);
      referenceNumbers.push(refs);
    }
  }

  req.session.data['departure-planeDocumentName[]'] = documentNames;
  req.session.data['departure-planeReferenceNumber[]'] = referenceNumbers;

  res.redirect('/delta/nmd/progress');
});

router.post('/delta/nmd/departure-transport-documents-train', function (req, res) {
  let documentNames = req.session.data['departure-trainDocumentName[]'] || [];
  let referenceNumbers = req.session.data['departure-trainReferenceNumber[]'] || [];

  const names = req.body['documentName[]'] || req.body.documentName;
  const refs = req.body['referenceNumber[]'] || req.body.referenceNumber;
  const editIndex = req.body.editIndex;

  if (editIndex !== undefined && editIndex !== '') {
    documentNames[editIndex] = names;
    referenceNumbers[editIndex] = refs;
  } else {
    if (Array.isArray(names)) {
      documentNames.push(...names);
      referenceNumbers.push(...refs);
    } else {
      documentNames.push(names);
      referenceNumbers.push(refs);
    }
  }

  req.session.data['departure-trainDocumentName[]'] = documentNames;
  req.session.data['departure-trainReferenceNumber[]'] = referenceNumbers;

  res.redirect('/delta/nmd/progress');
});

router.post('/delta/nmd/departure-transport-documents-vessel', function (req, res) {
  let documentNames = req.session.data['departure-vesselDocumentName[]'] || [];
  let referenceNumbers = req.session.data['departure-vesselReferenceNumber[]'] || [];

  const names = req.body['documentName[]'] || req.body.documentName;
  const refs = req.body['referenceNumber[]'] || req.body.referenceNumber;
  const editIndex = req.body.editIndex;

  if (editIndex !== undefined && editIndex !== '') {
    documentNames[editIndex] = names;
    referenceNumbers[editIndex] = refs;
  } else {
    if (Array.isArray(names)) {
      documentNames.push(...names);
      referenceNumbers.push(...refs);
    } else {
      documentNames.push(names);
      referenceNumbers.push(refs);
    }
  }

  req.session.data['departure-vesselDocumentName[]'] = documentNames;
  req.session.data['departure-vesselReferenceNumber[]'] = referenceNumbers;

  res.redirect('/delta/nmd/progress');
});


router.get('/delta/nmd/progress', function (req, res) {
  res.render('delta/nmd/progress.html', {
    data: req.session.data
  });
});
router.post('/delta/nmd/progress', function (req, res) {
  // Handle the progress form submission
  const action = req.body._action || req.body.formaction;

  if (action === 'progress') {
    // Redirect to the next step in the journey
    res.redirect('/delta/nmd/check-your-answers');
  } else {
    // Redirect to the previous step or stay on the same page
    res.redirect('/delta/nmd/progress');
  }
});


// Route for handling the 'Your reference' page
router.post('/delta/sd/your-reference', function (req, res) {
  req.session.data['your-reference'] = req.body['your-reference'];
  // Add more fields as needed

  // Redirect based on which button was pressed
  if (req.body._action === 'progress' || req.body['formaction'] === 'progress') {
    res.redirect('/delta/sd/progress');
  } else {
    res.redirect('/delta/sd/exporter-details');
  }
});

// Route for exporter details
router.post('/delta/sd/exporter-details', function (req, res) {
  req.session.data['company-name'] = req.body['company-name']
  // Add more fields as needed
  res.redirect('/delta/sd/product-details')
})

// GET handler for delta/sd/product-details
router.get('/delta/sd/product-details', function (req, res) {
  res.render('delta/sd/product-details', { data: req.session.data });
  delete req.session.data['formErrors'];
});

// Route for product details
router.post('/delta/sd/product-details', function (req, res) {
  // Validation for weight fields
  const errors = [];

  if (!req.body['entry-weight'] || req.body['entry-weight'] === '') {
    errors.push({
      fieldName: 'entry-weight',
      message: 'Enter the weight on the document in kg'
    });
  }

  if (!req.body['net-weight'] || req.body['net-weight'] === '') {
    errors.push({
      fieldName: 'net-weight',
      message: 'Enter the net weight of product on arrival'
    });
  }

  if (!req.body['fish-weight'] || req.body['fish-weight'] === '') {
    errors.push({
      fieldName: 'fish-weight',
      message: 'Enter the net weight of fishery products on arrival'
    });
  }

  // Check that fish-weight does not exceed net-weight
  if (req.body['fish-weight'] && req.body['net-weight']) {
    if (parseFloat(req.body['fish-weight']) > parseFloat(req.body['net-weight'])) {
      errors.push({
        fieldName: 'fish-weight',
        message: 'Fishery products net weight on arrival cannot exceed the product net weight on arrival'
      });
    }
  }

  if (errors.length > 0) {
    req.session.data['formErrors'] = errors;
    return res.redirect('/delta/sd/product-details');
  }

  const newEntry = {
    ukDocument: req.body['uk-document'], // now collected here
    issuingCountry: req.body['issuing-country'], // <-- add this line
    entryDocumentReference: req.body['entry-document-reference'], // now collected here
    entryWeight: req.body['entry-weight'], // <-- add this line
    species: req.body['species'],
    commodityCode: req.body['commodity-code'],
    description: req.body['description'],
    productReferenceNumber: req.body['productReferenceNumber'],
    netWeight: req.body['net-weight'],
    fishWeight: req.body['fish-weight']
  };

  if (!req.session.data['productEntries']) {
    req.session.data['productEntries'] = [];
  }

  const editIndex = req.session.data['editIndex'];

  if (typeof editIndex !== 'undefined') {
    req.session.data['productEntries'][editIndex] = newEntry;
    delete req.session.data['editIndex'];
  } else {
    req.session.data['productEntries'].push(newEntry);
  }

  // Clear fields and errors
  req.session.data['uk-document'] = '';
  req.session.data['issuing-country'] = '';
  req.session.data['entry-document-reference'] = '';
  req.session.data['entry-weight'] = '';
  req.session.data['species'] = '';
  req.session.data['commodity-code'] = '';
  req.session.data['description'] = '';
  req.session.data['productReferenceNumber'] = '';
  req.session.data['net-weight'] = '';
  req.session.data['fish-weight'] = '';
  delete req.session.data['formErrors'];

  res.redirect('/delta/sd/product-summary');
});




// GET handler for delta/sd/product-summary
router.get('/delta/sd/product-summary', function (req, res) {
  res.render('delta/sd/product-summary', { data: req.session.data });
});

// Route for product summary
router.post('/delta/sd/product-summary', function (req, res) {
  // Clear single-entry fields
  req.session.data['uk-document'] = '';
  req.session.data['issuing-country'] = '';
  req.session.data['entry-document-reference'] = '';
  req.session.data['entry-weight'] = '';
  req.session.data['productReferenceNumber'] = '';
  req.session.data['species'] = '';
  req.session.data['commodity-code'] = '';
  req.session.data['description'] = '';
  req.session.data['net-weight'] = '';
  req.session.data['fish-weight'] = '';
  delete req.session.data['editIndex'];

  req.session.data['more-products'] = req.body['more-products'];

  const productEntries = req.body['more-products'];

  if (productEntries === 'Yes') {
    res.redirect('/delta/sd/product-details'); // ✅ stays in SD flow
  } else if (productEntries === 'No') {
    res.redirect('/delta/sd/transport-type');
  } else {
    // ✅ No selection made — redirect to GET route
    res.redirect('/delta/sd/product-summary');
  }
});

router.get('/delta/sd/edit-product/:index', function (req, res) {
  const index = parseInt(req.params.index);
  const product = req.session.data['productEntries'][index];

  // Pre-fill session fields with selected product
  req.session.data['uk-document'] = product.ukDocument;
  req.session.data['issuing-country'] = product.issuingCountry;
  req.session.data['entry-document-reference'] = product.entryDocumentReference;
  req.session.data['entry-weight'] = product.entryWeight;
  req.session.data['productReferenceNumber'] = product.productReferenceNumber;
  req.session.data['species'] = product.species;
  req.session.data['commodity-code'] = product.commodityCode;
  req.session.data['description'] = product.description;
  req.session.data['net-weight'] = product.netWeight;
  req.session.data['fish-weight'] = product.fishWeight;

  // Store index for update later
  req.session.data['editIndex'] = index;

  res.redirect('/delta/sd/product-details');
});


router.get('/delta/sd/remove-product/:index', function (req, res) {
  const index = parseInt(req.params.index);
  if (!isNaN(index) && req.session.data['productEntries']) {
    req.session.data['productEntries'].splice(index, 1);
  }
  res.redirect('/delta/sd/product-summary');
});



// Route for handling transport selection
router.post('/delta/sd/transport-type', function (req, res) {
  const transportType = req.body['transport-type'];

  if (transportType === 'Truck') {
    res.redirect('/delta/sd/transport-truck');
  } else if (transportType === 'Plane') {
    res.redirect('/delta/sd/transport-plane');
  } else if (transportType === 'Train') {
    res.redirect('/delta/sd/transport-train');
  } else if (transportType === 'Container vessel') {
    res.redirect('/delta/sd/transport-container-vessel');
  } else {
    res.redirect('/delta/sd/transport-type');  // Redirect back if no option selected

  }
});

// Route for handling truck transport
router.post('/delta/sd/transport-truck', function (req, res) {
  req.session.data['departure-country'] = req.body['departure-country'];
  req.session.data['truck-nationality'] = req.body['truck-nationality'];
  req.session.data['truck-registration'] = req.body['registration-number'];
  req.session.data['export-place'] = req.body['export-place'];
  req.session.data['unloading-place'] = req.body['unloading-place'];
  req.session.data['freight-number'] = req.body['freight-number'];

        // Combine departure date
const departureDay = req.body['departure-date-day'];
const departureMonth = req.body['departure-date-month'];
const departureYear = req.body['departure-date-year'];
req.session.data['departure-date'] = `${departureDay}/${departureMonth}/${departureYear}`;

  // Add to transportTypes array in session
  req.session.data['transportTypes'] = req.session.data['transportTypes'] || [];
  req.session.data['transportTypes'].push({
    type: 'Truck',
    departureCountry: req.body['departure-country'],
    truckNationality: req.body['truck-nationality'],
    truckRegistration: req.body['registration-number'],
    exportPlace: req.body['export-place'],
    unloadingPlace: req.body['unloading-place'],
    freightBillNumber: req.body['freight-number'],
    departureDate: req.session.data['departure-date']
  });
  res.redirect('/delta/sd/transport-documents');
});

// Route for handling plane transport
router.post('/delta/sd/transport-plane', function (req, res) {
  req.session.data['plane-departure-country'] = req.body['plane-departure-country'];
  req.session.data['unloading-place-plane'] = req.body['unloading-place-plane'];
  req.session.data['airway-bill'] = req.body['airway-bill'];
  req.session.data['flight-number'] = req.body['flight-number'];
  req.session.data['plane-departure'] = req.body['plane-departure'];
  req.session.data['container-identification'] = req.body['container-identification'];

          // Combine plane departure date
  const departureDay = req.body['plane-departure-date-day'];
  const departureMonth = req.body['plane-departure-date-month'];
  const departureYear = req.body['plane-departure-date-year'];
  req.session.data['plane-departure-date'] = `${departureDay}/${departureMonth}/${departureYear}`;

  req.session.data['transportTypes'] = req.session.data['transportTypes'] || [];
  req.session.data['transportTypes'].push({
    type: 'Plane',
    planeDepartureCountry: req.body['plane-departure-country'],
    flightNumber: req.body['flight-number'],
    planeDeparture: req.body['plane-departure'],
    airwayBill: req.body['airway-bill'],
    unloadingPlacePlane: req.body['unloading-place-plane'],
    containerIdentification: req.body['container-identification'],
    planeDepartureDate: req.session.data['plane-departure-date']
  });
  res.redirect('/delta/sd/transport-documents-plane');
});

// Route for handling train transport
router.post('/delta/sd/transport-train', function (req, res) {
  req.session.data['train-departure-country'] = req.body['train-departure-country'];
  req.session.data['railway-bill'] = req.body['railway-bill'];
  req.session.data['train-departure'] = req.body['train-departure'];
  req.session.data['unloading-place-train'] = req.body['unloading-place-train'];
  req.session.data['freight-bill'] = req.body['freight-bill'];

      // Combine train departure date
  const departureDay = req.body['train-departure-date-day'];
  const departureMonth = req.body['train-departure-date-month'];
  const departureYear = req.body['train-departure-date-year'];
  req.session.data['train-departure-date'] = `${departureDay}/${departureMonth}/${departureYear}`;

  req.session.data['transportTypes'] = req.session.data['transportTypes'] || [];
  req.session.data['transportTypes'].push({
    type: 'Train',
    trainDepartureCountry: req.body['train-departure-country'],
    railwayBill: req.body['railway-bill'],
    trainDeparture: req.body['train-departure'],
    unloadingPlaceTrain: req.body['unloading-place-train'],
    freightBillNumber: req.body['freight-bill'],
    trainDepartureDate: req.session.data['train-departure-date']
  });
  res.redirect('/delta/sd/transport-documents-train');
});

// Route for handling container vessel transport
router.post('/delta/sd/transport-container-vessel', function (req, res) {
  req.session.data['container-vessel-departure-country'] = req.body['container-vessel-departure-country'];
  req.session.data['unloading-place-vessel'] = req.body['unloading-place-vessel'];
  req.session.data['vessel-name'] = req.body['vessel-name'];
  req.session.data['flag-state'] = req.body['flag-state'];
  req.session.data['container-vessel-departure'] = req.body['container-vessel-departure'];
  req.session.data['freight-bill'] = req.body['freight-bill'];

      // Combine container vessel departure date
  const departureDay = req.body['container-vessel-departure-date-day'];
  const departureMonth = req.body['container-vessel-departure-date-month'];
  const departureYear = req.body['container-vessel-departure-date-year'];
  req.session.data['container-vessel-departure-date'] = `${departureDay}/${departureMonth}/${departureYear}`;

  req.session.data['transportTypes'] = req.session.data['transportTypes'] || [];
  req.session.data['transportTypes'].push({
    type: 'Container vessel',
    containerVesselDepartureCountry: req.body['container-vessel-departure-country'],
    vesselName: req.body['vessel-name'],
    flagState: req.body['flag-state'],
    unloadingPlaceVessel: req.body['unloading-place-vessel'],
    containerVesselDeparture: req.body['container-vessel-departure'],
    freightBillNumber: req.body['freight-bill'],
    containerVesselDepartureDate: req.session.data['container-vessel-departure-date']
  });
  res.redirect('/delta/sd/transport-documents-vessel');
});


// TRUCK DOCUMENTS
router.post('/delta/sd/transport-documents', function (req, res) {
  let documentNames = req.session.data['documentName[]'] || [];
  let referenceNumbers = req.session.data['referenceNumber[]'] || [];

  const names = req.body['documentName[]'] || req.body.documentName;
  const refs = req.body['referenceNumber[]'] || req.body.referenceNumber;
  const editIndex = req.body.editIndex;

  if (editIndex !== undefined && editIndex !== '') {
    documentNames[editIndex] = names;
    referenceNumbers[editIndex] = refs;
  } else {
    if (Array.isArray(names)) {
      documentNames.push(...names);
      referenceNumbers.push(...refs);
    } else {
      documentNames.push(names);
      referenceNumbers.push(refs);
    }
  }

  req.session.data['documentName[]'] = documentNames;
  req.session.data['referenceNumber[]'] = referenceNumbers;

  res.redirect('/delta/sd/storage-facility-details');
});

// TRAIN DOCUMENTS
router.post('/delta/sd/transport-documents-train', function (req, res) {
  let documentNames = req.session.data['trainDocumentName[]'] || [];
  let referenceNumbers = req.session.data['trainReferenceNumber[]'] || [];

  const names = req.body['documentName[]'] || req.body.documentName;
  const refs = req.body['referenceNumber[]'] || req.body.referenceNumber;
  const editIndex = req.body.editIndex;

  if (editIndex !== undefined && editIndex !== '') {
    documentNames[editIndex] = names;
    referenceNumbers[editIndex] = refs;
  } else {
    if (Array.isArray(names)) {
      documentNames.push(...names);
      referenceNumbers.push(...refs);
    } else {
      documentNames.push(names);
      referenceNumbers.push(refs);
    }
  }

  req.session.data['trainDocumentName[]'] = documentNames;
  req.session.data['trainReferenceNumber[]'] = referenceNumbers;

  res.redirect('/delta/sd/storage-facility-details');
});

// PLANE DOCUMENTS
router.post('/delta/sd/transport-documents-plane', function (req, res) {
  let documentNames = req.session.data['planeDocumentName[]'] || [];
  let referenceNumbers = req.session.data['planeReferenceNumber[]'] || [];

  const names = req.body['documentName[]'] || req.body.documentName;
  const refs = req.body['referenceNumber[]'] || req.body.referenceNumber;
  const editIndex = req.body.editIndex;

  if (editIndex !== undefined && editIndex !== '') {
    documentNames[editIndex] = names;
    referenceNumbers[editIndex] = refs;
  } else {
    if (Array.isArray(names)) {
      documentNames.push(...names);
      referenceNumbers.push(...refs);
    } else {
      documentNames.push(names);
      referenceNumbers.push(refs);
    }
  }

  req.session.data['planeDocumentName[]'] = documentNames;
  req.session.data['planeReferenceNumber[]'] = referenceNumbers;

  res.redirect('/delta/sd/storage-facility-details');
});

// VESSEL DOCUMENTS
router.post('/delta/sd/transport-documents-vessel', function (req, res) {
  let documentNames = req.session.data['vesselDocumentName[]'] || [];
  let referenceNumbers = req.session.data['vesselReferenceNumber[]'] || [];

  const names = req.body['documentName[]'] || req.body.documentName;
  const refs = req.body['referenceNumber[]'] || req.body.referenceNumber;
  const editIndex = req.body.editIndex;

  if (editIndex !== undefined && editIndex !== '') {
    documentNames[editIndex] = names;
    referenceNumbers[editIndex] = refs;
  } else {
    if (Array.isArray(names)) {
      documentNames.push(...names);
      referenceNumbers.push(...refs);
    } else {
      documentNames.push(names);
      referenceNumbers.push(refs);
    }
  }

  req.session.data['vesselDocumentName[]'] = documentNames;
  req.session.data['vesselReferenceNumber[]'] = referenceNumbers;

  res.redirect('/delta/sd/storage-facility-details');
});


// Route for storage facility details
router.post('/delta/sd/storage-facility-details', function (req, res) {
  req.session.data['facility-name'] = req.body['facility-name'];

  // Combine arrival date
const arrivalDay = req.body['arrival-date-day'];
const arrivalMonth = req.body['arrival-date-month']; // fix typo in HTML
const arrivalYear = req.body['arrival-date-year'];
req.session.data['arrival-date'] = `${arrivalDay}/${arrivalMonth}/${arrivalYear}`;
  // Add more fields as needed
  res.redirect('/delta/sd/storage-facility-address');
});

// Route for storage facility details
router.post('/delta/sd/storage-facility-address', function (req, res) {
  req.session.data['postcode'] = req.body['postcode'];
  // Add more fields as needed
  res.redirect('/delta/sd/storage-facility-address-2');
});

// Route for storage facility address
router.post('/delta/sd/storage-facility-address-2', function (req, res) {
  req.session.data['building-number'] = req.body['building-number'];
  req.session.data['building-name'] = req.body['building-name'];
  req.session.data['sub-building-name'] = req.body['sub-building-name'];
  req.session.data['street-name'] = req.body['street-name'];
  req.session.data['county'] = req.body['county'];
  req.session.data['country'] = req.body['country'];
  // Add more fields as needed
  res.redirect('/delta/sd/storage-facility-confirmation');
});

// Route for storage facility confirmation
router.post('/delta/sd/storage-facility-confirmation', function (req, res) {
  
  // Add more fields as needed
  res.redirect('/delta/sd/storage-facility-approval');
});

// Route for storage facility approval
router.post('/delta/sd/storage-facility-approval', function (req, res) {
  let storageTypes = [].concat(req.body['product-storage'] || []);
  storageTypes = storageTypes.filter(item => item !== '_unchecked');
  req.session.data['product-storage'] = storageTypes;
  res.redirect('/delta/sd/departure-transport-type');
});



// Route for storage facility summary
router.post('/delta/sd/storage-facility-summary', function (req, res) {
  // Get current values from session
  const facilityName = req.session.data['facility-name'];
  const addAnother = req.body['storage-facility']; // Yes or No

  // Create a new facility entry
  const newFacility = {
    name: facilityName,
  };

  // Save to session array
  if (!req.session.data['storageFacilities']) {
    req.session.data['storageFacilities'] = [];
  }

  req.session.data['storageFacilities'].push(newFacility);

  // Redirect based on user choice
  if (addAnother === 'Yes') {
    res.redirect('/delta/sd/storage-facility-details');
  } else if (addAnother === 'No') {
    res.redirect('/delta/sd/departure-transport-type');
  } else {
    res.redirect('/delta/sd/storage-facility-summary');
  }
});

// Route for departure transport details
router.post('/delta/sd/departure-transport-type', function (req, res) {
  const transportType = req.body['departure-transport-type'];

  if (transportType === 'Truck') {
    res.redirect('/delta/sd/departure-transport-truck');
  } else if (transportType === 'Plane') {
    res.redirect('/delta/sd/departure-transport-plane');
  } else if (transportType === 'Train') {
    res.redirect('/delta/sd/departure-transport-train');
  } else if (transportType === 'Container vessel') {
    res.redirect('/delta/sd/departure-transport-container-vessel');
  } else {
    res.redirect('/delta/sd/departure-transport-type');
  }
});


router.post('/delta/sd/departure-transport-truck', function (req, res) {
  req.session.data['departure-destination-country'] = req.body['departure-destination-country'];
  req.session.data['destination-point-truck'] = req.body['destination-point-truck'];
  req.session.data['departure-truck-nationality'] = req.body['truck-nationality'];
  req.session.data['departure-truck-registration'] = req.body['registration-number'];
  req.session.data['departure-export-place'] = req.body['export-place'];
  req.session.data['departure-freight-number'] = req.body['freight-number'];
  req.session.data['container-identification-truck'] = req.body['container-identification-truck']; 


  const destinationCountry = req.body['departure-destination-country'];

  // Capture date parts
  const day = req.body['departure-date-uk-day'];
  const month = req.body['departure-date-uk-month'];
  const year = req.body['departure-date-uk-year'];

  // Combine into a single date string (optional formatting)
  const departureDate = `${day}/${month}/${year}`;
  req.session.data['departure-date-uk'] = departureDate;
  

  res.redirect('/delta/sd/departure-transport-documents');
});

router.post('/delta/sd/departure-transport-plane', function (req, res) {
  req.session.data['plane-departure-destination-country'] = req.body['plane-departure-destination-country'];
  req.session.data['destination-point-plane'] = req.body['destination-point-plane'];
  req.session.data['departure-airway-bill'] = req.body['airway-bill'];
  req.session.data['departure-flight-number'] = req.body['flight-number'];
  req.session.data['departure-plane-departure'] = req.body['plane-departure'];
  req.session.data['departure-container-identification'] = req.body['container-identification'];

    // Capture date parts
  const day = req.body['plane-departure-date-uk-day'];
  const month = req.body['plane-departure-date-uk-month'];
  const year = req.body['plane-departure-date-uk-year'];

  // Combine into a single date string (optional formatting)
  const departureDate = `${day}/${month}/${year}`;
  req.session.data['plane-departure-date-uk'] = departureDate;

  res.redirect('/delta/sd/departure-transport-documents-plane');
});

router.post('/delta/sd/departure-transport-train', function (req, res) {
  req.session.data['train-departure-destination-country'] = req.body['train-departure-destination-country'];
  req.session.data['destination-point-train'] = req.body['destination-point-train'];
  req.session.data['departure-railway-bill'] = req.body['railway-bill'];
  req.session.data['departure-train-departure'] = req.body['train-departure'];
  req.session.data['departure-freight-bill'] = req.body['freight-bill'];
  req.session.data['container-identification-train'] = req.body['container-identification-train']; 

      // Capture date parts
  const day = req.body['train-departure-date-uk-day'];
  const month = req.body['train-departure-date-uk-month'];
  const year = req.body['train-departure-date-uk-year'];
  const departureDate = `${day}/${month}/${year}`;
  req.session.data['train-departure-date-uk'] = departureDate;

  res.redirect('/delta/sd/departure-transport-documents-train');
});

router.post('/delta/sd/departure-transport-container-vessel', function (req, res) {
  req.session.data['container-vessel-departure-destination-country'] = req.body['container-vessel-departure-destination-country'];
  req.session.data['destination-point-vessel'] = req.body['destination-point-vessel'];
  req.session.data['departure-vessel-name'] = req.body['vessel-name'];
  req.session.data['departure-flag-state'] = req.body['flag-state'];
  req.session.data['departure-container-vessel-departure'] = req.body['container-vessel-departure'];
  req.session.data['departure-freight-bill'] = req.body['departure-freight-bill'];

      // Capture date parts
  const day = req.body['container-vessel-departure-date-uk-day'];
  const month = req.body['container-vessel-departure-date-uk-month'];
  const year = req.body['container-vessel-departure-date-uk-year'];
  const departureDate = `${day}/${month}/${year}`;
  req.session.data['container-vessel-departure-date-uk'] = departureDate;

  res.redirect('/delta/sd/departure-transport-documents-vessel');
});

router.post('/delta/sd/departure-transport-documents', function (req, res) {
  let documentNames = req.session.data['departure-documentName[]'] || [];
  let referenceNumbers = req.session.data['departure-referenceNumber[]'] || [];

  const names = req.body['documentName[]'] || req.body.documentName;
  const refs = req.body['referenceNumber[]'] || req.body.referenceNumber;
  const editIndex = req.body.editIndex;

  if (editIndex !== undefined && editIndex !== '') {
    documentNames[editIndex] = names;
    referenceNumbers[editIndex] = refs;
  } else {
    if (Array.isArray(names)) {
      documentNames.push(...names);
      referenceNumbers.push(...refs);
    } else {
      documentNames.push(names);
      referenceNumbers.push(refs);
    }
  }

  req.session.data['departure-documentName[]'] = documentNames;
  req.session.data['departure-referenceNumber[]'] = referenceNumbers;

  res.redirect('/delta/sd/departure-summary');
});

router.post('/delta/sd/departure-transport-documents-plane', function (req, res) {
  let documentNames = req.session.data['departure-planeDocumentName[]'] || [];
  let referenceNumbers = req.session.data['departure-planeReferenceNumber[]'] || [];

  const names = req.body['documentName[]'] || req.body.documentName;
  const refs = req.body['referenceNumber[]'] || req.body.referenceNumber;
  const editIndex = req.body.editIndex;

  if (editIndex !== undefined && editIndex !== '') {
    documentNames[editIndex] = names;
    referenceNumbers[editIndex] = refs;
  } else {
    if (Array.isArray(names)) {
      documentNames.push(...names);
      referenceNumbers.push(...refs);
    } else {
      documentNames.push(names);
      referenceNumbers.push(refs);
    }
  }

  req.session.data['departure-planeDocumentName[]'] = documentNames;
  req.session.data['departure-planeReferenceNumber[]'] = referenceNumbers;

  res.redirect('/delta/sd/departure-summary');
});

router.post('/delta/sd/departure-transport-documents-train', function (req, res) {
  let documentNames = req.session.data['departure-trainDocumentName[]'] || [];
  let referenceNumbers = req.session.data['departure-trainReferenceNumber[]'] || [];

  const names = req.body['documentName[]'] || req.body.documentName;
  const refs = req.body['referenceNumber[]'] || req.body.referenceNumber;
  const editIndex = req.body.editIndex;

  if (editIndex !== undefined && editIndex !== '') {
    documentNames[editIndex] = names;
    referenceNumbers[editIndex] = refs;
  } else {
    if (Array.isArray(names)) {
      documentNames.push(...names);
      referenceNumbers.push(...refs);
    } else {
      documentNames.push(names);
      referenceNumbers.push(refs);
    }
  }

  req.session.data['departure-trainDocumentName[]'] = documentNames;
  req.session.data['departure-trainReferenceNumber[]'] = referenceNumbers;

  res.redirect('/delta/sd/departure-summary');
});

router.post('/delta/sd/departure-transport-documents-vessel', function (req, res) {
  let documentNames = req.session.data['departure-vesselDocumentName[]'] || [];
  let referenceNumbers = req.session.data['departure-vesselReferenceNumber[]'] || [];

  const names = req.body['documentName[]'] || req.body.documentName;
  const refs = req.body['referenceNumber[]'] || req.body.referenceNumber;
  const editIndex = req.body.editIndex;

  if (editIndex !== undefined && editIndex !== '') {
    documentNames[editIndex] = names;
    referenceNumbers[editIndex] = refs;
  } else {
    if (Array.isArray(names)) {
      documentNames.push(...names);
      referenceNumbers.push(...refs);
    } else {
      documentNames.push(names);
      referenceNumbers.push(refs);
    }
  }

  req.session.data['departure-vesselDocumentName[]'] = documentNames;
  req.session.data['departure-vesselReferenceNumber[]'] = referenceNumbers;

  res.redirect('/delta/sd/departure-summary');
});


router.get('/delta/sd/progress', function (req, res) {
  res.render('delta/sd/progress.html', {
    data: req.session.data
  });
});

// Route for departure summary
router.post('/delta/sd/departure-summary', function (req, res) {
  const productEntries = req.session.data['productEntries'];

  if (productEntries && Array.isArray(productEntries)) {
    productEntries.forEach((entry, index) => {
      const netWeightKey = `departure-net-weight-${index}`;
      const fishWeightKey = `departure-fish-weight-${index}`;

      entry.departureNetWeight = req.body[netWeightKey];
      entry.departureFishWeight = req.body[fishWeightKey];
    });
  }

  res.redirect('/delta/sd/progress');
});

router.post('/delta/sd/progress', function (req, res) {
  // Handle the progress form submission
  const action = req.body._action || req.body.formaction;

  if (action === 'progress') {
    // Redirect to the next step in the journey
    res.redirect('/delta/sd/check-your-answers');
  } else {
    // Redirect to the previous step or stay on the same page
    res.redirect('/delta/sd/progress');
  }
});

// Route for handling the 'Your reference' page
router.post('/delta/ps/your-reference', function (req, res) {
  req.session.data['your-reference'] = req.body['your-reference'];
  // Add more fields as needed

  // Redirect based on which button was pressed
  if (req.body._action === 'progress' || req.body['formaction'] === 'progress') {
    res.redirect('/delta/ps/progress');
  } else {
    res.redirect('/delta/ps/exporter-details');
  }
});

// Route for exporter details
router.post('/delta/ps/exporter-details', function (req, res) {
  req.session.data['company-name'] = req.body['company-name']
  // Add more fields as needed
  res.redirect('/delta/ps/product-description')
})

// GET route for product description
router.get('/delta/ps/product-description', function (req, res) {
  res.render('delta/ps/product-description', {
    data: req.session.data || {},
    removeMode: req.session.data['removeMode'] || false,
    removeIndex: req.session.data['removeIndex']
  });
});

// Route for product description
router.post('/delta/ps/product-description', function (req, res) {
  if (!req.session.data['productEntries']) {
    req.session.data['productEntries'] = [];
  }

  const editIndex = req.session.data['editIndex'];

  if (typeof editIndex !== 'undefined') {
    // When editing: merge new description/commodity-code with existing entry data
    const existingEntry = req.session.data['productEntries'][editIndex];
    req.session.data['productEntries'][editIndex] = {
      ...existingEntry,
      commodityCode: req.body['commodity-code'],
      description: req.body['description'],
      isPartial: existingEntry.isPartial // preserve isPartial status
    };
  } else {
    // When adding new: create partial entry with just description and commodity code
    const newEntry = {
      commodityCode: req.body['commodity-code'],
      description: req.body['description'],
      isPartial: true // flag to indicate it's awaiting details
    };
    req.session.data['productEntries'].push(newEntry);
    // Set editIndex to the newly created entry so product-details knows to update it
    req.session.data['editIndex'] = req.session.data['productEntries'].length - 1;
  }

  req.session.data['description'] = req.body['description'];
  req.session.data['commodity-code'] = req.body['commodity-code'];

  res.redirect('/delta/ps/product-details');
});

// GET route for product details page
router.get('/delta/ps/product-details', function (req, res) {
  res.render('delta/ps/product-details', {
    data: req.session.data || {}
  });
  // Clear errors after displaying them so they don't persist on next visit
  delete req.session.data['formErrors'];
});

// Route for product details
router.post('/delta/ps/product-details', function (req, res) {
  const action = req.body.action;

  const newDetails = {
    ukDocument: req.body['uk-document'],
    issuingCountry: req.body['issuing-country'],
    species: req.body['species'],
    productReferenceNumber: req.body['productReferenceNumber'],
    'catch-certificate-code': req.body['catch-certificate-code'],
    'catch-certificate-weight': req.body['catch-certificate-weight'],
    'net-weight': req.body['net-weight'],
    'fish-weight': req.body['fish-weight'],
    isPartial: false,
    description: req.session.data['description'],
    commodityCode: req.session.data['commodity-code']
  };

  // Only validate when "Add" button is clicked, not when "Save and continue" is clicked
  if (action === 'add') {
    const errors = [];

    if (!req.body['catch-certificate-weight'] || req.body['catch-certificate-weight'] === '') {
      errors.push({
        fieldName: 'catch-certificate-weight',
        message: 'Enter the total weight landed in kg'
      });
    }

    if (!req.body['net-weight'] || req.body['net-weight'] === '') {
      errors.push({
        fieldName: 'net-weight',
        message: 'Enter the export weight in kg (before processing)'
      });
    }

    if (!req.body['fish-weight'] || req.body['fish-weight'] === '') {
      errors.push({
        fieldName: 'fish-weight',
        message: 'Enter the export weight in kg (after processing)'
      });
    }

    // Check weight logic: net-weight (before processing) should be ≤ catch-certificate-weight
    if (req.body['net-weight'] && req.body['catch-certificate-weight']) {
      if (parseFloat(req.body['net-weight']) > parseFloat(req.body['catch-certificate-weight'])) {
        errors.push({
          fieldName: 'net-weight',
          message: 'Export weight before processing must be the same or less than the total weight shown on catch certificate in kg'
        });
      }
    }

    // If there are errors, store them and re-render the form
    if (errors.length > 0) {
      req.session.data['formErrors'] = errors;
      return res.redirect('/delta/ps/product-details');
    }
  }

  // Clear any previous errors
  delete req.session.data['formErrors'];

  // ✅ Validate required fields before saving
  const hasRequiredFields =
    newDetails.species &&
    newDetails.productReferenceNumber &&
    newDetails['net-weight'] &&
    newDetails['fish-weight'] &&
    newDetails['catch-certificate-weight'];

  if (!req.session.data['productEntries']) {
    req.session.data['productEntries'] = [];
  }

  if (hasRequiredFields) {
    const editIndex = req.session.data['editIndex'];
    if (typeof editIndex !== 'undefined') {
      // Update existing entry and mark as complete
      newDetails.isPartial = false;
      req.session.data['productEntries'][editIndex] = newDetails;
      delete req.session.data['editIndex'];
    } else {
      // Add new entry
      newDetails.isPartial = false;
      req.session.data['productEntries'].push(newDetails);
    }
  }

  // ✅ Store species in session for pre-filling
  req.session.data['species'] = req.body['species'];

  if (action === 'add') {
    res.redirect('/delta/ps/product-details#species-table-container');
  } else if (action === 'continue') {
    // Clear editIndex when moving to next page
    delete req.session.data['editIndex'];
    res.redirect('/delta/ps/updated-product-summary');
  }
});

// Route for product summary search and pagination
router.get('/delta/ps/product-summary', function (req, res) {

  const searchQuery = (req.query.s || '').toLowerCase();
  const page = parseInt(req.query.page) || 1;
  const perPage = 10;

  let productEntries = req.session.data['productEntries'] || [];

// Filter
if (searchQuery) {
  productEntries = productEntries.filter(entry =>
    (entry.description ?? '').toString().toLowerCase().includes(searchQuery) ||
    (entry.species ?? '').toString().toLowerCase().includes(searchQuery) ||
    (entry.commodityCode ?? '').toString().toLowerCase().includes(searchQuery) ||
    (
      Array.isArray(entry.productReferenceNumber)
        ? entry.productReferenceNumber.some(ref =>
            ref.toLowerCase().includes(searchQuery)
          )
        : (entry.productReferenceNumber ?? '').toString().toLowerCase().includes(searchQuery)
    )
  );
}



  // Paginate
  const totalPages = Math.ceil(productEntries.length / perPage);
  const paginatedEntries = productEntries.slice((page - 1) * perPage, page * perPage);

  res.render('delta/ps/product-summary', {
    data: {
      productEntries: paginatedEntries,
      description: req.session.data['description']
    },
    currentPage: page,
    totalPages,
    searchQuery
  });
});

router.get('/delta/ps/edit-product/:index', function (req, res) {
  const index = parseInt(req.params.index);
  const product = req.session.data['productEntries'][index];

  // Pre-fill session fields with selected product
  req.session.data['uk-document'] = product.ukDocument;
  req.session.data['productReferenceNumber'] = product.productReferenceNumber;
  req.session.data['species'] = product.species;
  req.session.data['commodity-code'] = product.commodityCode;
  req.session.data['description'] = product.description;
  req.session.data['net-weight'] = product.netWeight;
  req.session.data['fish-weight'] = product.fishWeight;
  req.session.data['catch-certificate-weight'] = product['catch-certificate-weight'];

  // Store index for update later
  req.session.data['editIndex'] = index;

  res.redirect('/delta/ps/product-description');
});

// Route for remove product (similar to edit, but with removeMode flag)
router.get('/delta/ps/remove-product/:index', function (req, res) {
  const index = parseInt(req.params.index);
  const product = req.session.data['productEntries'][index];

  if (!product) {
    return res.redirect('/delta/ps/product-summary');
  }

  // Pre-fill session fields with selected product
  req.session.data['species'] = product.species;
  req.session.data['commodity-code'] = product.commodityCode;
  req.session.data['description'] = product.description;
  req.session.data['net-weight'] = product.netWeight;
  req.session.data['fish-weight'] = product.fishWeight;
  req.session.data['catch-certificate-weight'] = product['catch-certificate-weight'];
  req.session.data['productReferenceNumber'] = product.productReferenceNumber;

  // Set flags for removal flow
  req.session.data['removeMode'] = true;
  req.session.data['removeIndex'] = index;

  res.redirect('/delta/ps/product-description');
});

// Route for direct product removal from product-details (no confirmation)
router.get('/delta/ps/remove-product-directly/:index', function (req, res) {
  const index = parseInt(req.params.index);

  // Direct removal without confirmation
  if (req.session.data['productEntries'] && req.session.data['productEntries'][index]) {
    req.session.data['productEntries'].splice(index, 1);
  }

  // Clear product fields
  req.session.data['species'] = '';
  req.session.data['commodity-code'] = '';
  req.session.data['description'] = '';
  req.session.data['net-weight'] = '';
  req.session.data['fish-weight'] = '';
  req.session.data['catch-certificate-weight'] = '';
  req.session.data['productReferenceNumber'] = '';

  // Redirect back to product-details
  res.redirect('/delta/ps/product-details');
});

// Route for confirm remove product (GET)
router.get('/delta/ps/confirm-remove-product/:index', function (req, res) {
  const index = parseInt(req.params.index);
  const product = req.session.data['productEntries'][index];

  if (!product) {
    return res.redirect('/delta/ps/product-summary');
  }

  res.render('delta/ps/confirm-remove-product', {
    data: {
      description: product.description
    },
    productIndex: index
  });
});

// Route for confirm remove product (POST)
router.post('/delta/ps/confirm-remove-product/:index', function (req, res) {
  const action = req.body.action;

  if (action === 'yes') {
    // Remove ALL entries with the matching description
    const descriptionToRemove = req.session.data['description'];

    if (descriptionToRemove && req.session.data['productEntries']) {
      // Filter out all entries with matching description
      req.session.data['productEntries'] = req.session.data['productEntries'].filter(entry =>
        entry.description !== descriptionToRemove
      );
    }

    // Clear removal flags
    delete req.session.data['removeMode'];
    delete req.session.data['removeIndex'];

    // Clear product fields
    req.session.data['species'] = '';
    req.session.data['commodity-code'] = '';
    req.session.data['description'] = '';
    req.session.data['net-weight'] = '';
    req.session.data['fish-weight'] = '';
    req.session.data['catch-certificate-weight'] = '';
    req.session.data['productReferenceNumber'] = '';

    // Check if there are any products left
    const remainingProducts = (req.session.data['productEntries'] || []).filter(entry =>
      !entry.isPartial && entry.species
    );

    if (remainingProducts.length > 1) {
      // Multiple products remain - show summary
      res.redirect('/delta/ps/product-summary');
    } else {
      // One or no products left - go back to description to add/edit more
      res.redirect('/delta/ps/product-description');
    }
  } else {
    // No - clear removal flags but keep product data and go back to product-description
    delete req.session.data['removeMode'];
    delete req.session.data['removeIndex'];
    res.redirect('/delta/ps/product-description');
  }
});

// Route for product summary
router.post('/delta/ps/product-summary', function (req, res) {
  req.session.data['more-products'] = req.body['more-products'];

  const productEntries = req.body['more-products'];

  if (productEntries === 'Yes') {
    // ✅ Clear single-entry fields to prevent carry-over
    req.session.data['uk-document'] = '';
    req.session.data['productReferenceNumber'] = '';
    req.session.data['species'] = '';
    req.session.data['commodity-code'] = '';
    req.session.data['description'] = '';
    req.session.data['net-weight'] = '';
    req.session.data['fish-weight'] = '';
    req.session.data['catch-certificate-weight'] = '';

    // ✅ Clear edit index to ensure new entry is created
    delete req.session.data['editIndex'];

    // ❌ Do NOT clear productEntries — keep previous products
    // req.session.data['productEntries'] = []; ← removed

    res.redirect('/delta/ps/product-description'); // stays in PS flow
  } else if (productEntries === 'No') {
    res.redirect('/delta/ps/plant-details');
} else {
  // Render the summary page directly if no selection
  res.render('delta/ps/product-summary', {
    data: {
      productEntries: req.session.data['productEntries'],
      description: req.session.data['description']
    },
    currentPage: 1,
    totalPages: Math.ceil((req.session.data['productEntries'] || []).length / 10),
    searchQuery: ''
  });
}

});

// Route for updated-product-summary
router.get('/delta/ps/updated-product-summary', function (req, res) {
  const searchQuery = (req.query.s || '').toLowerCase();
  const page = parseInt(req.query.page) || 1;
  const perPage = 10;

  const allProductEntries = req.session.data['productEntries'] || [];

  // Filter out partial or incomplete entries
  let filteredEntries = allProductEntries.filter(entry =>
    !entry.isPartial && entry.species
  );

  // Apply search filter
  if (searchQuery) {
    filteredEntries = filteredEntries.filter(entry =>
      (entry.description ?? '').toLowerCase().includes(searchQuery) ||
      (entry.species ?? '').toLowerCase().includes(searchQuery) ||
      (entry.commodityCode ?? '').toLowerCase().includes(searchQuery) ||
      (
        Array.isArray(entry.productReferenceNumber)
          ? entry.productReferenceNumber.some(ref =>
              ref.toLowerCase().includes(searchQuery)
            )
          : (entry.productReferenceNumber ?? '').toLowerCase().includes(searchQuery)
      )
    );
  }

  // Paginate after filtering
  const totalPages = Math.ceil(filteredEntries.length / perPage);
  const paginatedEntries = filteredEntries.slice((page - 1) * perPage, page * perPage);

  res.render('delta/ps/updated-product-summary', {
    data: {
      productEntries: paginatedEntries,       // filtered + paginated
      allProductEntries: allProductEntries    // full list for counting
    },
    currentPage: page,
    totalPages,
    searchQuery
  });
});

//Route for updated-product-summary
router.post('/delta/ps/updated-product-summary', function (req, res) {
  const moreProducts = req.body['more-products'];
  req.session.data['more-products'] = moreProducts;

  if (moreProducts === 'Yes') {
    // Clear single-entry fields
    req.session.data['uk-document'] = '';
    req.session.data['productReferenceNumber'] = '';
    req.session.data['species'] = '';
    req.session.data['commodity-code'] = '';
    req.session.data['description'] = '';
    req.session.data['net-weight'] = '';
    req.session.data['fish-weight'] = '';
    req.session.data['catch-certificate-weight'] = '';
    delete req.session.data['editIndex'];

    res.redirect('/delta/ps/product-description');
  } else if (moreProducts === 'No') {
    res.redirect('/delta/ps/plant-details');
  } else {
    // No selection made — redirect to GET route
    res.redirect('/delta/ps/updated-product-summary');
  }
});



// Route for storage facility details
router.post('/delta/ps/plant-details', function (req, res) {
  req.session.data['plant-name'] = req.body['plant-name'];
  req.session.data['person-name'] = req.body['person-name'];
  req.session.data['approval-number'] = req.body['approval-number'];
  // Add more fields as needed
  res.redirect('/delta/ps/plant-address');
});

// Route for storage facility details
router.post('/delta/ps/plant-address', function (req, res) {
  req.session.data['postcode'] = req.body['postcode'];
  // Add more fields as needed
  res.redirect('/delta/ps/plant-address-2');
});

// Route for storage facility address
router.post('/delta/ps/plant-address-2', function (req, res) {
  req.session.data['building-number'] = req.body['building-number'];
  req.session.data['building-name'] = req.body['building-name'];
  req.session.data['sub-building-name'] = req.body['sub-building-name'];
  req.session.data['street-name'] = req.body['street-name'];
  req.session.data['county'] = req.body['county'];
  req.session.data['country'] = req.body['country'];
  // Add more fields as needed
  res.redirect('/delta/ps/plant-confirmation');
});

// Route for storage facility confirmation
router.post('/delta/ps/plant-confirmation', function (req, res) {
  
  // Add more fields as needed
  res.redirect('/delta/ps/health-certificate');

});

// Route for health certificate details
router.post('/delta/ps/health-certificate', function (req, res) {
  req.session.data['health-certificate'] = req.body['health-certificate'];

    // Combine arrival date
const arrivalDay = req.body['certificate-date-day'];
const arrivalMonth = req.body['certificate-date-month']; // fix typo in HTML
const arrivalYear = req.body['certificate-date-year'];
req.session.data['certificate-date'] = `${arrivalDay}/${arrivalMonth}/${arrivalYear}`;
  // Add more fields as needed
  res.redirect('/delta/ps/departure-destination');
});

// Route for departure destination
router.post('/delta/ps/departure-destination', function (req, res) {
  req.session.data['departure-destination-country'] = req.body['departure-destination-country'];
  // Add more fields as needed
  res.redirect('/delta/ps/progress');
});

router.post('/delta/ps/progress', function (req, res) {
  // Handle the progress form submission
  const action = req.body._action || req.body.formaction;

  if (action === 'progress') {
    // Redirect to the next step in the journey
    res.redirect('/delta/ps/check-your-answers');
  } else {
    // Redirect to the previous step or stay on the same page
    res.redirect('/delta/ps/progress');
  }
});
router.get('/epsilon/transport/check-your-answers', function (req, res) {
  const data = req.session.data;
  const groupedTransportTypes = getGroupedTransportTypes(data);
  res.render('epsilon/transport/check-your-answers', {
    data,
    groupedTransportTypes
  });
});


// Route for handling transport selection
router.post('/epsilon/transport/transport-type', function (req, res) {
  const transportType = req.body['transport-type'];

  if (transportType === 'Truck') {
    res.redirect('/epsilon/transport/transport-truck');
  } else if (transportType === 'Plane') {
    res.redirect('/epsilon/transport/transport-plane');
  } else if (transportType === 'Train') {
    res.redirect('/epsilon/transport/transport-train');
  } else if (transportType === 'Container vessel') {
    res.redirect('/epsilon/transport/transport-container-vessel');
  } else {
    res.redirect('/epsilon/transport/transport-type');  // Redirect back if no option selected

  }
});

// Route for handling landings option selection
router.post('/epsilon/landings-entry', function (req, res) {
  const landingsOption = req.body['landings-option'];

  if (landingsOption === 'dl' || landingsOption === 'manual' || landingsOption === 'upload') {
    req.session.data['landingsOption'] = landingsOption;
    res.redirect('/epsilon/catch/progress'); // Always go to progress, like gamma
  } else {
    res.redirect('/epsilon/catch/landings-entry'); // Redirect back if no option selected
  }
});

// Route for handling landings option selection (catch subfolder version)
router.post('/epsilon/catch/landings-entry', function (req, res) {
  const landingsOption = req.body['landings-option'];

  if (landingsOption === 'dl' || landingsOption === 'manual' || landingsOption === 'upload') {
    req.session.data['landingsOption'] = landingsOption;
    res.redirect('/epsilon/catch/progress');
  } else {
    res.redirect('/epsilon/catch/landings-entry');
  }
});




// Route for handling truck transport
router.post('/epsilon/transport/transport-truck', function (req, res) {
  req.session.data['truck-nationality'] = req.body['truck-nationality'];
  req.session.data['truck-registration'] = req.body['registration-number'];
  req.session.data['export-place'] = req.body['export-place'];
  req.session.data['destination-point-truck'] = req.body['destination-point-truck'];
  req.session.data['freight-number'] = req.body['freight-number'];
  req.session.data['container-identification-truck'] = req.body['container-identification-truck']; // single value

  // Add to transportTypes array in session
  req.session.data['transportTypes'] = req.session.data['transportTypes'] || [];
  req.session.data['transportTypes'].push({
    type: 'Truck',
    truckNationality: req.body['truck-nationality'],
    truckRegistration: req.body['registration-number'],
    exportPlace: req.body['export-place'],
    destinationPoint: req.body['destination-point-truck'],
    freightBillNumber: req.body['freight-number'],
    containerIdentification: req.body['container-identification-truck']
  });
 
  res.redirect('/epsilon/transport/transport-documents');
});

// Route for handling plane transport
router.post('/epsilon/transport/transport-plane', function (req, res) {
  req.session.data['airway-bill'] = req.body['airway-bill'];
  req.session.data['flight-number'] = req.body['flight-number'];
  req.session.data['plane-departure'] = req.body['plane-departure'];
  req.session.data['destination-point-plane'] = req.body['destination-point-plane'];
  req.session.data['container-identification'] = req.body['container-identification'];

  req.session.data['transportTypes'] = req.session.data['transportTypes'] || [];
  req.session.data['transportTypes'].push({
    type: 'Plane',
    flightNumber: req.body['flight-number'],
    planeDeparture: req.body['plane-departure'],
    destinationPoint: req.body['destination-point-plane'],
    airwayBill: req.body['airway-bill'],
    containerIdentification: req.body['container-identification']
  });
  res.redirect('/epsilon/transport/transport-documents-plane');
});

// Route for handling train transport
router.post('/epsilon/transport/transport-train', function (req, res) {
  req.session.data['railway-bill'] = req.body['railway-bill'];
  req.session.data['train-departure'] = req.body['train-departure'];
  req.session.data['destination-point-train'] = req.body['destination-point-train'];
  req.session.data['freight-bill'] = req.body['freight-bill'];
  req.session.data['container-identification-train'] = req.body['container-identification-train']; // single value


  req.session.data['transportTypes'] = req.session.data['transportTypes'] || [];
  req.session.data['transportTypes'].push({
    type: 'Train',
    railwayBill: req.body['railway-bill'],
    trainDeparture: req.body['train-departure'],
    destinationPoint: req.body['destination-point-train'],
    freightBillNumber: req.body['freight-bill'],
    containerIdentification: req.body['container-identification-train']
  });
  res.redirect('/epsilon/transport/transport-documents-train');
});

// Route for handling container vessel transport
router.post('/epsilon/transport/transport-container-vessel', function (req, res) {
  req.session.data['vessel-name'] = req.body['vessel-name'];
  req.session.data['flag-state'] = req.body['flag-state'];
  req.session.data['container-vessel-departure'] = req.body['container-vessel-departure'];
  req.session.data['destination-point-vessel'] = req.body['destination-point-vessel'];
  req.session.data['freight-bill'] = req.body['freight-bill'];

  req.session.data['transportTypes'] = req.session.data['transportTypes'] || [];
  req.session.data['transportTypes'].push({
    type: 'Container vessel',
    vesselName: req.body['vessel-name'],
    flagState: req.body['flag-state'],
    containerVesselDeparture: req.body['container-vessel-departure'],
    destinationPoint: req.body['destination-point-vessel'],
    freightBillNumber: req.body['freight-bill']
  });
  res.redirect('/epsilon/transport/transport-documents-vessel');
});


// TRUCK DOCUMENTS
router.post('/epsilon/transport/transport-documents', function (req, res) {
  let documentNames = req.session.data['documentName[]'] || [];
  let referenceNumbers = req.session.data['referenceNumber[]'] || [];

  const names = req.body['documentName[]'] || req.body.documentName;
  const refs = req.body['referenceNumber[]'] || req.body.referenceNumber;
  const editIndex = req.body.editIndex;

  if (editIndex !== undefined && editIndex !== '') {
    documentNames[editIndex] = names;
    referenceNumbers[editIndex] = refs;
  } else {
    if (Array.isArray(names)) {
      documentNames.push(...names);
      referenceNumbers.push(...refs);
    } else {
      documentNames.push(names);
      referenceNumbers.push(refs);
    }
  }

  req.session.data['documentName[]'] = documentNames;
  req.session.data['referenceNumber[]'] = referenceNumbers;

  res.redirect('/epsilon/transport/transport-additional');
});

// TRAIN DOCUMENTS
router.post('/epsilon/transport/transport-documents-train', function (req, res) {
  let documentNames = req.session.data['trainDocumentName[]'] || [];
  let referenceNumbers = req.session.data['trainReferenceNumber[]'] || [];

  const names = req.body['documentName[]'] || req.body.documentName;
  const refs = req.body['referenceNumber[]'] || req.body.referenceNumber;
  const editIndex = req.body.editIndex;

  if (editIndex !== undefined && editIndex !== '') {
    documentNames[editIndex] = names;
    referenceNumbers[editIndex] = refs;
  } else {
    if (Array.isArray(names)) {
      documentNames.push(...names);
      referenceNumbers.push(...refs);
    } else {
      documentNames.push(names);
      referenceNumbers.push(refs);
    }
  }

  req.session.data['trainDocumentName[]'] = documentNames;
  req.session.data['trainReferenceNumber[]'] = referenceNumbers;

  res.redirect('/epsilon/transport/transport-additional');
});

// PLANE DOCUMENTS
router.post('/epsilon/transport/transport-documents-plane', function (req, res) {
  let documentNames = req.session.data['planeDocumentName[]'] || [];
  let referenceNumbers = req.session.data['planeReferenceNumber[]'] || [];

  const names = req.body['documentName[]'] || req.body.documentName;
  const refs = req.body['referenceNumber[]'] || req.body.referenceNumber;
  const editIndex = req.body.editIndex;

  if (editIndex !== undefined && editIndex !== '') {
    documentNames[editIndex] = names;
    referenceNumbers[editIndex] = refs;
  } else {
    if (Array.isArray(names)) {
      documentNames.push(...names);
      referenceNumbers.push(...refs);
    } else {
      documentNames.push(names);
      referenceNumbers.push(refs);
    }
  }

  req.session.data['planeDocumentName[]'] = documentNames;
  req.session.data['planeReferenceNumber[]'] = referenceNumbers;

  res.redirect('/epsilon/transport/transport-additional');
});

// VESSEL DOCUMENTS
router.post('/epsilon/transport/transport-documents-vessel', function (req, res) {
  let documentNames = req.session.data['vesselDocumentName[]'] || [];
  let referenceNumbers = req.session.data['vesselReferenceNumber[]'] || [];

  const names = req.body['documentName[]'] || req.body.documentName;
  const refs = req.body['referenceNumber[]'] || req.body.referenceNumber;
  const editIndex = req.body.editIndex;

  if (editIndex !== undefined && editIndex !== '') {
    documentNames[editIndex] = names;
    referenceNumbers[editIndex] = refs;
  } else {
    if (Array.isArray(names)) {
      documentNames.push(...names);
      referenceNumbers.push(...refs);
    } else {
      documentNames.push(names);
      referenceNumbers.push(refs);
    }
  }

  req.session.data['vesselDocumentName[]'] = documentNames;
  req.session.data['vesselReferenceNumber[]'] = referenceNumbers;

  res.redirect('/epsilon/transport/transport-additional');
});





router.post('/epsilon/transport/transport-additional', function (req, res) {
  // Handle removal of a transport row
  const removeIndex = req.body.removeIndex;
  if (removeIndex !== undefined && removeIndex !== '') {
    let transportTypes = req.session.data['transportTypes'] || [];
    // Get the type of the transport being removed
    const removed = transportTypes[removeIndex];
    const removedType = removed && removed.type;
    transportTypes.splice(removeIndex, 1);
    req.session.data['transportTypes'] = transportTypes;
    // Only remove from the relevant document/reference arrays for the removed type
    if (removedType === 'Truck') {
      let documentNames = req.session.data['documentName[]'] || [];
      let referenceNumbers = req.session.data['referenceNumber[]'] || [];
      if (documentNames.length > removeIndex) documentNames.splice(removeIndex, 1);
      if (referenceNumbers.length > removeIndex) referenceNumbers.splice(removeIndex, 1);
      req.session.data['documentName[]'] = documentNames;
      req.session.data['referenceNumber[]'] = referenceNumbers;
    } else if (removedType === 'Train') {
      let trainDocumentNames = req.session.data['trainDocumentName[]'] || [];
      let trainReferenceNumbers = req.session.data['trainReferenceNumber[]'] || [];
      if (trainDocumentNames.length > removeIndex) trainDocumentNames.splice(removeIndex, 1);
      if (trainReferenceNumbers.length > removeIndex) trainReferenceNumbers.splice(removeIndex, 1);
      req.session.data['trainDocumentName[]'] = trainDocumentNames;
      req.session.data['trainReferenceNumber[]'] = trainReferenceNumbers;
    } else if (removedType === 'Plane') {
      let planeDocumentNames = req.session.data['planeDocumentName[]'] || [];
      let planeReferenceNumbers = req.session.data['planeReferenceNumber[]'] || [];
      if (planeDocumentNames.length > removeIndex) planeDocumentNames.splice(removeIndex, 1);
      if (planeReferenceNumbers.length > removeIndex) planeReferenceNumbers.splice(removeIndex, 1);
      req.session.data['planeDocumentName[]'] = planeDocumentNames;
      req.session.data['planeReferenceNumber[]'] = planeReferenceNumbers;
    } else if (removedType === 'Container vessel') {
      let vesselDocumentNames = req.session.data['vesselDocumentName[]'] || [];
      let vesselReferenceNumbers = req.session.data['vesselReferenceNumber[]'] || [];
      if (vesselDocumentNames.length > removeIndex) vesselDocumentNames.splice(removeIndex, 1);
      if (vesselReferenceNumbers.length > removeIndex) vesselReferenceNumbers.splice(removeIndex, 1);
      req.session.data['vesselDocumentName[]'] = vesselDocumentNames;
      req.session.data['vesselReferenceNumber[]'] = vesselReferenceNumbers;
    }
    return res.redirect('/epsilon/transport/transport-additional');
  }
  let documentNames = req.session.data['documentName[]'] || [];
  let referenceNumbers = req.session.data['referenceNumber[]'] || [];

  const name = req.body['documentName[]'];
  const ref = req.body['referenceNumber[]'];
  const editIndex = req.body.editIndex;

  if (editIndex !== undefined && editIndex !== '') {
    documentNames[editIndex] = name;
    referenceNumbers[editIndex] = ref;
  } else {
    if (Array.isArray(name)) {
      documentNames.push(...name);
      referenceNumbers.push(...ref);
    } else {
      documentNames.push(name);
      referenceNumbers.push(ref);
    }
  }

  // Save the updated document names and reference numbers back to the session

  req.session.data['documentName[]'] = documentNames;
  req.session.data['referenceNumber[]'] = referenceNumbers;
  req.session.data['additional-modes'] = req.body['additional-modes'];

  const additionalModes = req.body['additional-modes'];
  if (additionalModes === 'Yes') {
    res.redirect('/epsilon/transport/transport-type');
  } else if (additionalModes === 'No') {
    res.redirect('/epsilon/progress-complete');
  } else {
    res.redirect('/epsilon/transport/transport-additional');
  }
});

// Route for handling the 'Your reference' page
router.post('/epsilon/your-reference', function (req, res) {
  req.session.data['your-reference'] = req.body['your-reference'];
  // Add more fields as needed

  // Redirect based on which button was pressed
  if (req.body._action === 'progress' || req.body['formaction'] === 'progress') {
    res.redirect('/epsilon/progress');
  } else {
    res.redirect('/epsilon/exporter-details');
  }
});


// GET handler for your-reference
router.get('/epsilon/catch/your-reference', function (req, res) {
  res.render('epsilon/catch/your-reference', { data: req.session.data });
});

// POST handler for your-reference
router.post('/epsilon/catch/your-reference', function (req, res) {
  req.session.data['your-reference'] = req.body['your-reference'];
  res.redirect('/epsilon/catch/exporter-details');
});

// GET handler for exporter details
router.get('/epsilon/catch/exporter-details', function (req, res) {
  res.render('epsilon/catch/exporter-details', { data: req.session.data });
});

// Route for exporter details
router.post('/epsilon/catch/exporter-details', function (req, res) {
  req.session.data['exporter-name'] = req.body['exporter-name']
  req.session.data['company-name'] = req.body['exporter-name']
  // Add more fields as needed
  res.redirect('/epsilon/catch/add-products')
})

// Route for epsilon catch proceed to landings (conditional based on landing option)
// GET handler for add-products
router.get('/epsilon/catch/add-products', function (req, res) {
  res.render('epsilon/catch/add-products', { data: req.session.data });
});

// Conditional redirect based on stored landing option
router.post('/epsilon/catch/proceed-landing', function (req, res) {
  const landingsOption = req.session.data['landingsOption'] || 'dl';
  if (landingsOption === 'manual' || landingsOption === 'upload') {
    res.redirect('/epsilon/catch/manual-entry');
  } else {
    res.redirect('/epsilon/catch/direct-landing');
  }
});

// Route for epsilon catch add landing
router.post('/epsilon/catch/add-landing', function (req, res) {
  const landings = req.session.data['landings'] || [];
  const species = req.body['species'] || '—';
  const state = req.body['state'] || '—';
  const presentation = req.body['presentation'] || '—';

  landings.push({
    product: species + ', ' + state + ', ' + presentation,
    startDate: req.body['startDate'] || '',
    dateLanded: req.body['dateLanded'] || '',
    catchArea: req.body['faoArea'] || '',
    vessel: req.body['vessel'] || '',
    gearCategory: req.body['gear1'] || '',
    gearType: req.body['gear2'] || '',
    exportWeight: req.body['weight'] || ''
  });
  req.session.data['landings'] = landings;

  // Calculate total export weight from all landings
  const totalWeight = landings.reduce((sum, landing) => sum + (parseFloat(landing.exportWeight) || 0), 0);
  req.session.data['totalWeight'] = totalWeight.toFixed(2);

  // Calculate export weight per product
  const productWeights = {};
  landings.forEach(landing => {
    const key = landing.product;
    productWeights[key] = (productWeights[key] || 0) + (parseFloat(landing.exportWeight) || 0);
  });

  // Update products with their calculated export weights from landings
  const products = req.session.data['products'] || [];
  products.forEach(product => {
    const productKey = (product.species || '—') + ', ' + (product.state || '—') + ', ' + (product.presentation || '—');
    product.exportWeight = productWeights[productKey] ? productWeights[productKey].toFixed(2) : '0.00';
  });
  req.session.data['products'] = products;

  res.redirect('/epsilon/catch/manual-entry');
});

router.post('/epsilon/catch/add-products', function (req, res) {
  const products = req.session.data['products'] ?? [];
  const {
    species,
    state,
    presentation,
    'commodity-code': commodityCode
  } = req.body;
  products.push({
    species,
    state,
    presentation,
    commodityCode
  });
  req.session.data['products'] = products;
  res.redirect('/epsilon/catch/add-products');
})

// Redirect to the next step or back to add-products page
router.post('/epsilon/catch/delete-product/:index', function (req, res) {
  const products = req.session.data['products'] ?? [];
  products.splice(parseInt(req.params.index) - 1, 1);
  req.session.data['products'] = products;
  res.redirect('/epsilon/catch/add-products');

})

// GET handlers for catch pages
router.get('/epsilon/catch/your-reference', function (req, res) {
  res.render('epsilon/catch/your-reference', { data: req.session.data });
});

router.get('/epsilon/catch/landings-entry', function (req, res) {
  res.render('epsilon/catch/landings-entry', { data: req.session.data });
});

router.get('/epsilon/catch/catch-waters', function (req, res) {
  res.render('epsilon/catch/catch-waters', { data: req.session.data });
});

router.get('/epsilon/catch/export-journey', function (req, res) {
  res.render('epsilon/catch/export-journey', { data: req.session.data });
});

router.get('/epsilon/catch/progress', function (req, res) {
  res.render('epsilon/catch/progress', { data: req.session.data });
});

router.get('/epsilon/catch/direct-landing', function (req, res) {
  res.render('epsilon/catch/direct-landing', { data: req.session.data });
});

router.get('/epsilon/catch/manual-entry', function (req, res) {
  res.render('epsilon/catch/manual-entry', { data: req.session.data });
});

router.get('/epsilon/catch/catch-certificate-complete-processing', function (req, res) {
  res.render('epsilon/catch/catch-certificate-complete-processing', { data: req.session.data });
});

router.post('/epsilon/catch/catch-certificate-complete-processing', function (req, res) {
  res.redirect('/epsilon/catch/progress');
});

router.get('/epsilon/catch/upload-file', function (req, res) {
  res.render('epsilon/catch/upload-file', { data: req.session.data });
});

router.get('/epsilon/catch/product-favourites', function (req, res) {
  res.render('epsilon/catch/product-favourites', { data: req.session.data });
});

// GET handlers for transport pages
router.get('/epsilon/catch/transport/transport-type', function (req, res) {
  res.render('epsilon/catch/transport/transport-type', { data: req.session.data });
});

router.get('/epsilon/catch/transport/transport-additional', function (req, res) {
  res.render('epsilon/catch/transport/transport-additional', { data: req.session.data });
});

router.get('/epsilon/catch/transport/transport-truck', function (req, res) {
  res.render('epsilon/catch/transport/transport-truck', { data: req.session.data });
});

router.get('/epsilon/catch/transport/transport-train', function (req, res) {
  res.render('epsilon/catch/transport/transport-train', { data: req.session.data });
});

router.get('/epsilon/catch/transport/transport-plane', function (req, res) {
  res.render('epsilon/catch/transport/transport-plane', { data: req.session.data });
});

router.get('/epsilon/catch/transport/transport-container-vessel', function (req, res) {
  res.render('epsilon/catch/transport/transport-container-vessel', { data: req.session.data });
});

router.get('/epsilon/catch/transport/transport-documents', function (req, res) {
  res.render('epsilon/catch/transport/transport-documents', { data: req.session.data });
});

router.get('/epsilon/catch/transport/transport-documents-plane', function (req, res) {
  res.render('epsilon/catch/transport/transport-documents-plane', { data: req.session.data });
});

router.get('/epsilon/catch/transport/transport-documents-train', function (req, res) {
  res.render('epsilon/catch/transport/transport-documents-train', { data: req.session.data });
});

router.get('/epsilon/catch/transport/transport-documents-vessel', function (req, res) {
  res.render('epsilon/catch/transport/transport-documents-vessel', { data: req.session.data });
});


// Route for adding a product favourite
router.post('/epsilon/product-favourites', function (req, res) {
  const favourites = req.session.data['favourites'] ?? [];
  const {
    species,
    state,
    presentation,
    'commodity-code': commodityCode
  } = req.body;

  favourites.push({
    species,
    state,
    presentation,
    commodityCode
  });

  req.session.data['favourites'] = favourites;
  res.redirect('/epsilon/product-favourites');
});

// Route for deleting a product favourite by index
router.post('/epsilon/delete-favourite/:index', function (req, res) {
  const favourites = req.session.data['favourites'] ?? [];
  favourites.splice(parseInt(req.params.index), 1);
  req.session.data['favourites'] = favourites;
  res.redirect('/epsilon/product-favourites');
});

// Route for rendering the product favourites page
router.get('/epsilon/product-favourites', function (req, res) {
  res.render('epsilon/product-favourites', { data: req.session.data });
});


// Route for displaying the add-landings page
router.get('/epsilon/direct-landing', function (req, res) {
  res.render('epsilon/catch/direct-landing', { data: req.session.data });
});

// Route for landing details
router.post('../epsilon/direct-landing', function (req, res) {
  const session = req.session.data;

  // Save form fields to session
  session['startDateDay'] = req.body['startDateDay'];
  session['startDateMonth'] = req.body['startDateMonth'];
  session['startDateYear'] = req.body['startDateYear'];

  session['day'] = req.body['dateLandedDay'];
  session['month'] = req.body['dateLandedMonth'];
  session['year'] = req.body['dateLandedYear'];

  session['faoArea'] = req.body['faoArea'];
  session['highSeas'] = req.body['highSeas'];
  session['eez'] = req.body['eez'];
  session['rfmo'] = req.body['rfmo'];
  session['vessel'] = req.body['vessel'];
  session['gear1'] = req.body['gear1'];
  session['gear2'] = req.body['gear2'];
  session['processed-uk'] = req.body['processed-uk'];

 // Save weights array
session['weights'] = req.body['weights'];

// Calculate total export weight
let totalWeight = 0;
const weights = req.body['weights'];

if (weights) {
  for (const item of Object.values(weights)) {
    const weight = parseFloat(item.exportWeight);
    if (!isNaN(weight)) {
      totalWeight += weight;
    }
  }
}

session['totalWeight'] = totalWeight.toFixed(2);

// Check if processing confirmation is needed
if (req.body['processed-uk'] === 'yes') {
  res.redirect('/epsilon/catch/catch-certificate-complete-processing');
} else {
  res.redirect('../epsilon/catch-waters');
}

});


// Route for landing details
router.post('../epsilon/manual-entry', function (req, res) {
  const session = req.session.data;

  // Save form fields to session
  session['startDateDay'] = req.body['startDateDay'];
  session['startDateMonth'] = req.body['startDateMonth'];
  session['startDateYear'] = req.body['startDateYear'];

  session['day'] = req.body['dateLandedDay'];
  session['month'] = req.body['dateLandedMonth'];
  session['year'] = req.body['dateLandedYear'];

  session['faoArea'] = req.body['faoArea'];
  session['highSeas'] = req.body['highSeas'];
  session['eez'] = req.body['eez'];
  session['rfmo'] = req.body['rfmo'];
  session['vessel'] = req.body['vessel'];
  session['gear1'] = req.body['gear1'];
  session['gear2'] = req.body['gear2'];
  session['processed-uk'] = req.body['processed-uk'];

  session['weights'] = req.body['weights']; // This is an array of objects

  // Calculate total weight
  let totalWeight = 0;
  const weights = req.body['weights'];

  if (weights) {
    for (const item of Object.values(weights)) {
      const weight = parseFloat(item.exportWeight);
      if (!isNaN(weight)) {
        totalWeight += weight;
      }
    }
  }

  session['totalWeight'] = totalWeight.toFixed(2);

  // Track landings
  if (!session.landings) {
    session.landings = [];
  }

  // Add new landing to the array
  session.landings.push({
    startDateDay: req.body['startDateDay'],
    startDateMonth: req.body['startDateMonth'],
    startDateYear: req.body['startDateYear'],
    dateLandedDay: req.body['dateLandedDay'],
    dateLandedMonth: req.body['dateLandedMonth'],
    dateLandedYear: req.body['dateLandedYear'],
    faoArea: req.body['faoArea'],
    vessel: req.body['vessel'],
    gear1: req.body['gear1'],
    gear2: req.body['gear2'],
    weights: req.body['weights']
  });

  // Save landing count
  session['landingCount'] = session.landings.length;

  // Check if processing confirmation is needed
  if (req.body['processed-uk'] === 'yes') {
    res.redirect('/epsilon/catch/processing-confirmation');
  } else {
    // Redirect to the next step
    res.redirect('../epsilon/catch-waters');
  }
});



// Route for export journey


router.post('../epsilon/catch-waters', function (req, res) {
  req.session.data['waters'] = req.body['waters']; // This will be an array if multiple checkboxes are selected
  res.redirect('../epsilon/export-journey');
});

// Proper absolute path route for epsilon catch-waters
router.post('/epsilon/catch/catch-waters', function (req, res) {
  req.session.data['waters'] = req.body['waters'];
  res.redirect('/epsilon/catch/export-journey');
});

router.post('../epsilon/progress', function (req, res) {
  req.session.data['waters'] = req.body['waters'];
  res.redirect('../epsilon/progress');
});

router.post('../epsilon/export-journey', function (req, res) {
  req.session.data['waters'] = req.body['waters'];
  res.redirect('../epsilon/export-journey');
});

// Route for epsilon catch transport-type
router.post('/epsilon/catch/transport/transport-type', function (req, res) {
  req.session.data['departure-country'] = req.body['departure-country'];
  req.session.data['destination-country'] = req.body['destination-country'];
  const transportType = req.body['transport-type'];

  if (transportType === 'Truck') {
    res.redirect('/epsilon/catch/transport/transport-truck');
  } else if (transportType === 'Plane') {
    res.redirect('/epsilon/catch/transport/transport-plane');
  } else if (transportType === 'Train') {
    res.redirect('/epsilon/catch/transport/transport-train');
  } else if (transportType === 'Container vessel') {
    res.redirect('/epsilon/catch/transport/transport-container-vessel');
  } else {
    res.redirect('/epsilon/catch/transport/transport-type');
  }
});

// POST routes for epsilon catch transport pages
router.post('/epsilon/catch/transport/transport-truck', function (req, res) {
  req.session.data['truck-nationality'] = req.body['truck-nationality'];
  req.session.data['truck-registration'] = req.body['registration-number'];
  req.session.data['export-place'] = req.body['export-place'];
  req.session.data['destination-point-truck'] = req.body['destination-point-truck'];
  req.session.data['freight-number'] = req.body['freight-number'];
  req.session.data['container-identification-truck'] = req.body['container-identification-truck'];
  req.session.data['transportTypes'] = req.session.data['transportTypes'] || [];
  req.session.data['transportTypes'].push({
    type: 'Truck',
    truckNationality: req.body['truck-nationality'],
    truckRegistration: req.body['registration-number'],
    exportPlace: req.body['export-place'],
    destinationPoint: req.body['destination-point-truck'],
    freightBillNumber: req.body['freight-number'],
    containerIdentification: req.body['container-identification-truck']
  });
  res.redirect('/epsilon/catch/transport/transport-documents');
});

router.post('/epsilon/catch/transport/transport-plane', function (req, res) {
  req.session.data['airway-bill'] = req.body['airway-bill'];
  req.session.data['flight-number'] = req.body['flight-number'];
  req.session.data['plane-departure'] = req.body['plane-departure'];
  req.session.data['destination-point-plane'] = req.body['destination-point-plane'];
  req.session.data['container-identification'] = req.body['container-identification'];
  req.session.data['transportTypes'] = req.session.data['transportTypes'] || [];
  req.session.data['transportTypes'].push({
    type: 'Plane',
    flightNumber: req.body['flight-number'],
    planeDeparture: req.body['plane-departure'],
    destinationPoint: req.body['destination-point-plane'],
    airwayBill: req.body['airway-bill'],
    containerIdentification: req.body['container-identification']
  });
  res.redirect('/epsilon/catch/transport/transport-documents-plane');
});

router.post('/epsilon/catch/transport/transport-train', function (req, res) {
  req.session.data['railway-bill'] = req.body['railway-bill'];
  req.session.data['train-departure'] = req.body['train-departure'];
  req.session.data['destination-point-train'] = req.body['destination-point-train'];
  req.session.data['freight-bill'] = req.body['freight-bill'];
  req.session.data['container-identification-train'] = req.body['container-identification-train'];
  req.session.data['transportTypes'] = req.session.data['transportTypes'] || [];
  req.session.data['transportTypes'].push({
    type: 'Train',
    railwayBill: req.body['railway-bill'],
    trainDeparture: req.body['train-departure'],
    destinationPoint: req.body['destination-point-train'],
    freightBillNumber: req.body['freight-bill'],
    containerIdentification: req.body['container-identification-train']
  });
  res.redirect('/epsilon/catch/transport/transport-documents-train');
});

router.post('/epsilon/catch/transport/transport-container-vessel', function (req, res) {
  req.session.data['vessel-name'] = req.body['vessel-name'];
  req.session.data['flag-state'] = req.body['flag-state'];
  req.session.data['container-vessel-departure'] = req.body['container-vessel-departure'];
  req.session.data['destination-point-vessel'] = req.body['destination-point-vessel'];
  req.session.data['freight-bill'] = req.body['freight-bill'];
  req.session.data['transportTypes'] = req.session.data['transportTypes'] || [];
  req.session.data['transportTypes'].push({
    type: 'Container vessel',
    vesselName: req.body['vessel-name'],
    flagState: req.body['flag-state'],
    containerVesselDeparture: req.body['container-vessel-departure'],
    destinationPoint: req.body['destination-point-vessel'],
    freightBillNumber: req.body['freight-bill']
  });
  res.redirect('/epsilon/catch/transport/transport-documents-vessel');
});

router.post('/epsilon/catch/transport/transport-documents', function (req, res) {
  let documentNames = req.session.data['documentName[]'] || [];
  let referenceNumbers = req.session.data['referenceNumber[]'] || [];
  const names = req.body['documentName[]'] || req.body.documentName;
  const refs = req.body['referenceNumber[]'] || req.body.referenceNumber;
  const editIndex = req.body.editIndex;
  if (editIndex !== undefined && editIndex !== '') {
    documentNames[editIndex] = names;
    referenceNumbers[editIndex] = refs;
  } else {
    if (Array.isArray(names)) { documentNames.push(...names); referenceNumbers.push(...refs); }
    else { documentNames.push(names); referenceNumbers.push(refs); }
  }
  req.session.data['documentName[]'] = documentNames;
  req.session.data['referenceNumber[]'] = referenceNumbers;
  res.redirect('/epsilon/catch/transport/transport-additional');
});

router.post('/epsilon/catch/transport/transport-documents-plane', function (req, res) {
  let documentNames = req.session.data['planeDocumentName[]'] || [];
  let referenceNumbers = req.session.data['planeReferenceNumber[]'] || [];
  const names = req.body['documentName[]'] || req.body.documentName;
  const refs = req.body['referenceNumber[]'] || req.body.referenceNumber;
  const editIndex = req.body.editIndex;
  if (editIndex !== undefined && editIndex !== '') {
    documentNames[editIndex] = names;
    referenceNumbers[editIndex] = refs;
  } else {
    if (Array.isArray(names)) { documentNames.push(...names); referenceNumbers.push(...refs); }
    else { documentNames.push(names); referenceNumbers.push(refs); }
  }
  req.session.data['planeDocumentName[]'] = documentNames;
  req.session.data['planeReferenceNumber[]'] = referenceNumbers;
  res.redirect('/epsilon/catch/transport/transport-additional');
});

router.post('/epsilon/catch/transport/transport-documents-train', function (req, res) {
  let documentNames = req.session.data['trainDocumentName[]'] || [];
  let referenceNumbers = req.session.data['trainReferenceNumber[]'] || [];
  const names = req.body['documentName[]'] || req.body.documentName;
  const refs = req.body['referenceNumber[]'] || req.body.referenceNumber;
  const editIndex = req.body.editIndex;
  if (editIndex !== undefined && editIndex !== '') {
    documentNames[editIndex] = names;
    referenceNumbers[editIndex] = refs;
  } else {
    if (Array.isArray(names)) { documentNames.push(...names); referenceNumbers.push(...refs); }
    else { documentNames.push(names); referenceNumbers.push(refs); }
  }
  req.session.data['trainDocumentName[]'] = documentNames;
  req.session.data['trainReferenceNumber[]'] = referenceNumbers;
  res.redirect('/epsilon/catch/transport/transport-additional');
});

router.post('/epsilon/catch/transport/transport-documents-vessel', function (req, res) {
  let documentNames = req.session.data['vesselDocumentName[]'] || [];
  let referenceNumbers = req.session.data['vesselReferenceNumber[]'] || [];
  const names = req.body['documentName[]'] || req.body.documentName;
  const refs = req.body['referenceNumber[]'] || req.body.referenceNumber;
  const editIndex = req.body.editIndex;
  if (editIndex !== undefined && editIndex !== '') {
    documentNames[editIndex] = names;
    referenceNumbers[editIndex] = refs;
  } else {
    if (Array.isArray(names)) { documentNames.push(...names); referenceNumbers.push(...refs); }
    else { documentNames.push(names); referenceNumbers.push(refs); }
  }
  req.session.data['vesselDocumentName[]'] = documentNames;
  req.session.data['vesselReferenceNumber[]'] = referenceNumbers;
  res.redirect('/epsilon/catch/transport/transport-additional');
});

router.post('/epsilon/catch/transport/transport-additional', function (req, res) {
  const removeIndex = req.body.removeIndex;
  if (removeIndex !== undefined && removeIndex !== '') {
    let transportTypes = req.session.data['transportTypes'] || [];
    const removed = transportTypes[removeIndex];
    const removedType = removed && removed.type;
    transportTypes.splice(removeIndex, 1);
    req.session.data['transportTypes'] = transportTypes;
    if (removedType === 'Truck') {
      let dn = req.session.data['documentName[]'] || [];
      let rn = req.session.data['referenceNumber[]'] || [];
      if (dn.length > removeIndex) dn.splice(removeIndex, 1);
      if (rn.length > removeIndex) rn.splice(removeIndex, 1);
      req.session.data['documentName[]'] = dn;
      req.session.data['referenceNumber[]'] = rn;
    } else if (removedType === 'Train') {
      let dn = req.session.data['trainDocumentName[]'] || [];
      let rn = req.session.data['trainReferenceNumber[]'] || [];
      if (dn.length > removeIndex) dn.splice(removeIndex, 1);
      if (rn.length > removeIndex) rn.splice(removeIndex, 1);
      req.session.data['trainDocumentName[]'] = dn;
      req.session.data['trainReferenceNumber[]'] = rn;
    } else if (removedType === 'Plane') {
      let dn = req.session.data['planeDocumentName[]'] || [];
      let rn = req.session.data['planeReferenceNumber[]'] || [];
      if (dn.length > removeIndex) dn.splice(removeIndex, 1);
      if (rn.length > removeIndex) rn.splice(removeIndex, 1);
      req.session.data['planeDocumentName[]'] = dn;
      req.session.data['planeReferenceNumber[]'] = rn;
    } else if (removedType === 'Container vessel') {
      let dn = req.session.data['vesselDocumentName[]'] || [];
      let rn = req.session.data['vesselReferenceNumber[]'] || [];
      if (dn.length > removeIndex) dn.splice(removeIndex, 1);
      if (rn.length > removeIndex) rn.splice(removeIndex, 1);
      req.session.data['vesselDocumentName[]'] = dn;
      req.session.data['vesselReferenceNumber[]'] = rn;
    }
    return res.redirect('/epsilon/catch/transport/transport-additional');
  }
  let documentNames = req.session.data['documentName[]'] || [];
  let referenceNumbers = req.session.data['referenceNumber[]'] || [];
  const name = req.body['documentName[]'];
  const ref = req.body['referenceNumber[]'];
  const editIndex = req.body.editIndex;
  if (editIndex !== undefined && editIndex !== '') {
    documentNames[editIndex] = name;
    referenceNumbers[editIndex] = ref;
  } else {
    if (Array.isArray(name)) { documentNames.push(...name); referenceNumbers.push(...ref); }
    else { documentNames.push(name); referenceNumbers.push(ref); }
  }
  req.session.data['documentName[]'] = documentNames;
  req.session.data['referenceNumber[]'] = referenceNumbers;
  req.session.data['additional-modes'] = req.body['additional-modes'];
  const additionalModes = req.body['additional-modes'];
  if (additionalModes === 'Yes') {
    res.redirect('/epsilon/catch/transport/transport-type');
  } else if (additionalModes === 'No') {
    res.redirect('/epsilon/catch/transport/check-your-answers');
  } else {
    res.redirect('/epsilon/catch/transport/transport-additional');
  }
});

router.get('/epsilon/catch/transport/check-your-answers', function (req, res) {
  res.render('epsilon/catch/transport/check-your-answers', { data: req.session.data });
});

// Route for epsilon catch progress from export-journey
router.post('/epsilon/catch/progress', function (req, res) {
  req.session.data['departure-country'] = req.body['departure-country'];
  req.session.data['destination-country'] = req.body['destination-country'];
  res.redirect('/epsilon/catch/progress');
});

// Route for plane transport

router.post('../epsilon/progress', function (req, res) {
  req.session.data['departure-country'] = req.body['departure-country'];
  req.session.data['destination-country'] = req.body['destination-country'];
  res.redirect('../epsilon/progress');
});

router.post('../epsilon/transport/transport-type', function (req, res) {
  req.session.data['departure-country'] = req.body['departure-country'];
  req.session.data['destination-country'] = req.body['destination-country'];
  res.redirect('../epsilon/transport/transport-type');
});

router.post('../epsilon/progress', function (req, res) {
  req.session.data['airway-bill'] = req.body['airway-bill'];
  req.session.data['flight-number'] = req.body['flight-number'];
  req.session.data['plane-departure'] = req.body['plane-departure'];
  req.session.data['container-identification'] = req.body['container-identification']; // single value
  req.session.data['freight-bill'] = req.body['freight-bill'];
  res.redirect('../epsilon/progress');
});

router.post('../epsilon/transport/transport-documents-plane', function (req, res) {
  req.session.data['airway-bill'] = req.body['airway-bill'];
  req.session.data['flight-number'] = req.body['flight-number'];
  req.session.data['plane-departure'] = req.body['plane-departure'];
  req.session.data['container-identification'] = req.body['container-identification']; // single value
  req.session.data['freight-bill'] = req.body['freight-bill'];
  res.redirect('../epsilon/transport/transport-documents-plane');
});

router.post('../epsilon/transport/check-your-answers', function (req, res) {
  // You could log, save, or simulate submission here
  console.log('Final submission:', req.session.data);

  // Redirect to a confirmation page
  res.redirect('../epsilon/catch-certificate-complete');
});

router.get('../gamma/catch-certificate-complete', function (req, res) {
  res.render('../gamma/catch-certificate-complete');
});

// Add your routes here
// Route for displaying the 'Check your answers' page
router.get('/poc/transport/check-your-answers', function (req, res) {
  const data = req.session.data;
  const groupedTransportTypes = getGroupedTransportTypes(data);
  res.render('poc/transport/check-your-answers', {
    data,
    groupedTransportTypes
  });
});


// Route for handling transport selection
router.post('/poc/transport/transport-type', function (req, res) {
  const transportType = req.body['transport-type'];

  if (transportType === 'Truck') {
    res.redirect('/poc/transport/transport-truck');
  } else if (transportType === 'Plane') {
    res.redirect('/poc/transport/transport-plane');
  } else if (transportType === 'Train') {
    res.redirect('/poc/transport/transport-train');
  } else if (transportType === 'Container vessel') {
    res.redirect('/poc/transport/transport-container-vessel');
  } else {
    res.redirect('/poc/transport/transport-type');  // Redirect back if no option selected

  }
});


// Route for handling truck transport
router.post('/poc/transport/transport-truck', function (req, res) {
  req.session.data['truck-nationality'] = req.body['truck-nationality'];
  req.session.data['truck-registration'] = req.body['registration-number'];
  req.session.data['export-place'] = req.body['export-place'];
  req.session.data['freight-number'] = req.body['freight-number'];

  // Add to transportTypes array in session
  req.session.data['transportTypes'] = req.session.data['transportTypes'] || [];
  req.session.data['transportTypes'].push({
    type: 'Truck',
    truckNationality: req.body['truck-nationality'],
    truckRegistration: req.body['registration-number'],
    exportPlace: req.body['export-place'],
    freightBillNumber: req.body['freight-number']
  });
  res.redirect('/poc/transport/transport-documents');
});

// Route for handling plane transport
router.post('/poc/transport/transport-plane', function (req, res) {
  req.session.data['airway-bill'] = req.body['airway-bill'];
  req.session.data['flight-number'] = req.body['flight-number'];
  req.session.data['plane-departure'] = req.body['plane-departure'];
  req.session.data['container-identification'] = req.body['container-identification'];

  req.session.data['transportTypes'] = req.session.data['transportTypes'] || [];
  req.session.data['transportTypes'].push({
    type: 'Plane',
    flightNumber: req.body['flight-number'],
    planeDeparture: req.body['plane-departure'],
    airwayBill: req.body['airway-bill'],
    containerIdentification: req.body['container-identification']
  });
  res.redirect('/poc/transport/transport-documents-plane');
});

// Route for handling train transport
router.post('/poc/transport/transport-train', function (req, res) {
  req.session.data['railway-bill'] = req.body['railway-bill'];
  req.session.data['train-departure'] = req.body['train-departure'];
  req.session.data['freight-bill'] = req.body['freight-bill'];

  req.session.data['transportTypes'] = req.session.data['transportTypes'] || [];
  req.session.data['transportTypes'].push({
    type: 'Train',
    railwayBill: req.body['railway-bill'],
    trainDeparture: req.body['train-departure'],
    freightBillNumber: req.body['freight-bill']
  });
  res.redirect('/poc/transport/transport-documents-train');
});

// Route for handling container vessel transport
router.post('/poc/transport/transport-container-vessel', function (req, res) {
  req.session.data['vessel-name'] = req.body['vessel-name'];
  req.session.data['flag-state'] = req.body['flag-state'];
  req.session.data['container-vessel-departure'] = req.body['container-vessel-departure'];
  req.session.data['freight-bill'] = req.body['freight-bill'];

  req.session.data['transportTypes'] = req.session.data['transportTypes'] || [];
  req.session.data['transportTypes'].push({
    type: 'Container vessel',
    vesselName: req.body['vessel-name'],
    flagState: req.body['flag-state'],
    containerVesselDeparture: req.body['container-vessel-departure'],
    freightBillNumber: req.body['freight-bill']
  });
  res.redirect('/poc/transport/transport-documents-vessel');
});


router.get('/poc/transport/transport-documents', function (req, res) {
  const editIndex = req.query.edit;
  const removeIndex = req.query.remove;

  let documentNames = req.session.data['documentName[]'] || [];
  let referenceNumbers = req.session.data['referenceNumber[]'] || [];

  // Handle removal
  if (removeIndex !== undefined) {
    documentNames.splice(removeIndex, 1);
    referenceNumbers.splice(removeIndex, 1);
    req.session.data['documentName[]'] = documentNames;
    req.session.data['referenceNumber[]'] = referenceNumbers;
    return res.redirect('/poc/transport/transport-additional');
  }

  // Handle editing
  if (editIndex !== undefined) {
    res.render('poc/transport/transport-documents', {
      data: req.session.data,
      editIndex: editIndex,
      editDocumentName: documentNames[editIndex],
      editReferenceNumber: referenceNumbers[editIndex]
    });
  } else {
    res.render('poc/transport/transport-documents', {
      data: req.session.data
    });
  }
});



router.post('/poc/transport/transport-additional', function (req, res) {
  // Handle removal of a transport row
  const removeIndex = req.body.removeIndex;
  if (removeIndex !== undefined && removeIndex !== '') {
    let transportTypes = req.session.data['transportTypes'] || [];
    // Get the type of the transport being removed
    const removed = transportTypes[removeIndex];
    const removedType = removed && removed.type;
    transportTypes.splice(removeIndex, 1);
    req.session.data['transportTypes'] = transportTypes;
    // Only remove from the relevant document/reference arrays for the removed type
    if (removedType === 'Truck') {
      let documentNames = req.session.data['documentName[]'] || [];
      let referenceNumbers = req.session.data['referenceNumber[]'] || [];
      if (documentNames.length > removeIndex) documentNames.splice(removeIndex, 1);
      if (referenceNumbers.length > removeIndex) referenceNumbers.splice(removeIndex, 1);
      req.session.data['documentName[]'] = documentNames;
      req.session.data['referenceNumber[]'] = referenceNumbers;
    } else if (removedType === 'Train') {
      let trainDocumentNames = req.session.data['trainDocumentName[]'] || [];
      let trainReferenceNumbers = req.session.data['trainReferenceNumber[]'] || [];
      if (trainDocumentNames.length > removeIndex) trainDocumentNames.splice(removeIndex, 1);
      if (trainReferenceNumbers.length > removeIndex) trainReferenceNumbers.splice(removeIndex, 1);
      req.session.data['trainDocumentName[]'] = trainDocumentNames;
      req.session.data['trainReferenceNumber[]'] = trainReferenceNumbers;
    } else if (removedType === 'Plane') {
      let planeDocumentNames = req.session.data['planeDocumentName[]'] || [];
      let planeReferenceNumbers = req.session.data['planeReferenceNumber[]'] || [];
      if (planeDocumentNames.length > removeIndex) planeDocumentNames.splice(removeIndex, 1);
      if (planeReferenceNumbers.length > removeIndex) planeReferenceNumbers.splice(removeIndex, 1);
      req.session.data['planeDocumentName[]'] = planeDocumentNames;
      req.session.data['planeReferenceNumber[]'] = planeReferenceNumbers;
    } else if (removedType === 'Container vessel') {
      let vesselDocumentNames = req.session.data['vesselDocumentName[]'] || [];
      let vesselReferenceNumbers = req.session.data['vesselReferenceNumber[]'] || [];
      if (vesselDocumentNames.length > removeIndex) vesselDocumentNames.splice(removeIndex, 1);
      if (vesselReferenceNumbers.length > removeIndex) vesselReferenceNumbers.splice(removeIndex, 1);
      req.session.data['vesselDocumentName[]'] = vesselDocumentNames;
      req.session.data['vesselReferenceNumber[]'] = vesselReferenceNumbers;
    }
    return res.redirect('/poc/transport/transport-additional');
  }
  let documentNames = req.session.data['documentName[]'] || [];
  let referenceNumbers = req.session.data['referenceNumber[]'] || [];

  const name = req.body['documentName[]'];
  const ref = req.body['referenceNumber[]'];
  const editIndex = req.body.editIndex;

  if (editIndex !== undefined && editIndex !== '') {
    documentNames[editIndex] = name;
    referenceNumbers[editIndex] = ref;
  } else {
    if (Array.isArray(name)) {
      documentNames.push(...name);
      referenceNumbers.push(...ref);
    } else {
      documentNames.push(name);
      referenceNumbers.push(ref);
    }
  }

  req.session.data['documentName[]'] = documentNames;
  req.session.data['referenceNumber[]'] = referenceNumbers;
  req.session.data['additional-modes'] = req.body['additional-modes'];

  const additionalModes = req.body['additional-modes'];
  if (additionalModes === 'Yes') {
    res.redirect('/poc/transport/transport-type');
  } else if (additionalModes === 'No') {
    res.redirect('/poc/progress-complete');
  } else {
    res.redirect('/poc/transport/transport-additional');
  }
});




// Route for exporter details
router.post('../poc/add-products', function (req, res) {
  req.session.data['exporter-name'] = req.body['exporter-name']
  req.session.data['company-name'] = req.body['exporter-name']
  // Add more fields as needed
  res.redirect('../poc/add-products')
})



// Route for landing details
router.post('../poc/add-landings', function (req, res) {
  const session = req.session.data;

  // Save form fields to session
  session['startDateDay'] = req.body['startDateDay'];
  session['startDateMonth'] = req.body['startDateMonth'];
  session['startDateYear'] = req.body['startDateYear'];

  session['day'] = req.body['dateLandedDay'];
  session['month'] = req.body['dateLandedMonth'];
  session['year'] = req.body['dateLandedYear'];

  session['faoArea'] = req.body['faoArea'];
  session['highSeas'] = req.body['highSeas'];
  session['eez'] = req.body['eez'];
  session['rfmo'] = req.body['rfmo'];
  session['vessel'] = req.body['vessel'];
  session['weight'] = req.body['weight'];
  session['gear1'] = req.body['gear1'];
  session['gear2'] = req.body['gear2'];

  // Redirect to the next step
  res.redirect('../poc/catch-waters');
});


// Route for export journey


router.post('../poc/catch-waters', function (req, res) {
  req.session.data['waters'] = req.body['waters']; // This will be an array if multiple checkboxes are selected
  res.redirect('../poc/export-journey');
});

router.post('../poc/progress', function (req, res) {
  req.session.data['waters'] = req.body['waters'];
  res.redirect('../poc/progress');
});

router.post('../poc/export-journey', function (req, res) {
  req.session.data['waters'] = req.body['waters'];
  res.redirect('../poc/export-journey');
});

// Route for plane transport

router.post('../poc/progress', function (req, res) {
  req.session.data['departure-country'] = req.body['departure-country'];
  req.session.data['destination-country'] = req.body['destination-country'];
  res.redirect('../poc/progress');
});

router.post('../poc/transport/transport-type', function (req, res) {
  req.session.data['departure-country'] = req.body['departure-country'];
  req.session.data['destination-country'] = req.body['destination-country'];
  res.redirect('../poc/transport/transport-type');
});

router.post('../poc/progress', function (req, res) {
  req.session.data['airway-bill'] = req.body['airway-bill'];
  req.session.data['flight-number'] = req.body['flight-number'];
  req.session.data['plane-departure'] = req.body['plane-departure'];
  req.session.data['container-identification'] = req.body['container-identification']; // single value
  req.session.data['freight-bill'] = req.body['freight-bill'];
  res.redirect('../poc/progress');
});

router.post('../poc/transport/transport-documents-plane', function (req, res) {
  req.session.data['airway-bill'] = req.body['airway-bill'];
  req.session.data['flight-number'] = req.body['flight-number'];
  req.session.data['plane-departure'] = req.body['plane-departure'];
  req.session.data['container-identification'] = req.body['container-identification']; // single value
  req.session.data['freight-bill'] = req.body['freight-bill'];
  res.redirect('../poc/transport/transport-documents-plane');
});

router.post('../poc/transport/check-your-answers', function (req, res) {
  // You could log, save, or simulate submission here
  console.log('Final submission:', req.session.data);

  // Redirect to a confirmation page
  res.redirect('../poc/catch-certificate-complete');
});

router.get('../poc/catch-certificate-complete', function (req, res) {
  res.render('../poc/catch-certificate-complete');
});

// Helper function to group transport types and attach document arrays
function getGroupedTransportTypes(data) {
  const grouped = {};
  const types = data['transportTypes'] || [];
  types.forEach((t, idx) => {
    // Only attach document arrays to the first entry of each type
    const isFirstOfType = idx === types.findIndex(e => e.type === t.type);
    const entry = { ...t, _originalIndex: idx };
    if (isFirstOfType) {
      if (t.type === 'Truck') {
        entry.documentName = data['documentName[]'] || [];
        entry.referenceNumber = data['referenceNumber[]'] || [];
      } else if (t.type === 'Train') {
        entry.documentName = data['trainDocumentName[]'] || [];
        entry.referenceNumber = data['trainReferenceNumber[]'] || [];
      } else if (t.type === 'Plane') {
        entry.documentName = data['planeDocumentName[]'] || [];
        entry.referenceNumber = data['planeReferenceNumber[]'] || [];
      } else if (t.type === 'Container vessel') {
        entry.documentName = data['vesselDocumentName[]'] || [];
        entry.referenceNumber = data['vesselReferenceNumber[]'] || [];
      }
    } else {
      entry.documentName = [];
      entry.referenceNumber = [];
    }
    if (!grouped[t.type]) grouped[t.type] = [];
    grouped[t.type].push(entry);
  });
  // Remove duplicate document/reference display: only keep docs/refs on first entry of each type
  Object.keys(grouped).forEach(type => {
    grouped[type].forEach((entry, i) => {
      if (i > 0) {
        entry.documentName = [];
        entry.referenceNumber = [];
      }
    });
  });
  return grouped;
}

// Update GET for check-your-answers
router.get('/epsilon/transport/check-your-answers', function (req, res) {
  const data = req.session.data;
  const groupedTransportTypes = getGroupedTransportTypes(data);
  res.render('epsilon/transport/check-your-answers', {
    data,
    groupedTransportTypes
  });
});

// Update GET for transport-additional
router.get('/epsilon/transport/transport-additional', function (req, res) {
  const data = req.session.data;
  const groupedTransportTypes = getGroupedTransportTypes(data);
  res.render('epsilon/transport/transport-additional', {
    data,
    groupedTransportTypes
  });
});

//Routes for non-manipulation document (nmd)

// Route for handling the 'Your reference' page
router.post('/epsilon/nmd/your-reference', function (req, res) {
  req.session.data['your-reference'] = req.body['your-reference'];
  // Add more fields as needed

  // Redirect based on which button was pressed
  if (req.body._action === 'progress' || req.body['formaction'] === 'progress') {
    res.redirect('/epsilon/nmd/progress');
  } else {
    res.redirect('/epsilon/nmd/exporter-details');
  }
});

// Route for exporter details
router.post('/epsilon/nmd/exporter-details', function (req, res) {
  req.session.data['company-name'] = req.body['company-name']
  // Add more fields as needed
  res.redirect('/epsilon/nmd/uk-document')
})

// Route for uk document details
router.post('/epsilon/nmd/uk-document', function (req, res) {
  req.session.data['uk-document'] = req.body['uk-document'];

  const issuedInUK = req.body['uk-document'];

  if (issuedInUK === 'Yes') {
    res.redirect('/epsilon/nmd/confirm-uk-document');
  } else if (issuedInUK === 'No') {
    res.redirect('/epsilon/nmd/confirm-uk-document-2');
  } else {
    res.redirect('/epsilon/nmd/uk-document'); // fallback if nothing selected
  }
});


// Route for uk document confirmation
router.post('/epsilon/nmd/confirm-uk-document', function (req, res) {
  req.session.data['entry-document-reference'] = req.body['entry-document-reference']
  // Add more fields as needed
  res.redirect('/epsilon/nmd/product-details')
});

// Route for uk document confirmation for third country
router.post('/epsilon/nmd/confirm-uk-document-2', function (req, res) {
  req.session.data['entry-document-reference-2'] = req.body['entry-document-reference-2']
  // Add more fields as needed
  res.redirect('/epsilon/nmd/product-details')
});


// Route for product details
router.post('/epsilon/nmd/product-details', function (req, res) {
const newEntry = {
  species: req.body['species'],
  commodityCode: req.body['commodity-code'],
  description: req.body['description'],
  referenceNumber: req.session.data['entry-document-reference'], // ✅ copy from top-level
  productReferenceNumber: req.body['productReferenceNumber'],
  netWeight: req.body['net-weight'],
  fishWeight: req.body['fish-weight']
};


  if (!req.session.data['productEntries']) {
    req.session.data['productEntries'] = [];
  }

  const editIndex = req.session.data['editIndex'];

  if (typeof editIndex !== 'undefined') {
    req.session.data['productEntries'][editIndex] = newEntry;
    delete req.session.data['editIndex'];
  } else {
    req.session.data['productEntries'].push(newEntry);
  }

  // Clear fields
  req.session.data['species'] = '';
  req.session.data['commodity-code'] = '';
  req.session.data['description'] = '';
  req.session.data['productReferenceNumber'] = '';
  req.session.data['net-weight'] = '';
  req.session.data['fish-weight'] = '';

  res.redirect('/epsilon/nmd/product-summary');
});



// Route for product summary
router.post('/epsilon/nmd/product-summary', function (req, res) {


  // Clear single-entry fields
  req.session.data['species'] = '';
  req.session.data['commodity-code'] = '';
  req.session.data['description'] = '';
  req.session.data['productReferenceNumber'] = '';
  req.session.data['net-weight'] = '';
  req.session.data['fish-weight'] = '';

  req.session.data['more-products'] = req.body['more-products'];

  const productEntries = req.body['more-products'];

  if (productEntries === 'Yes') {
    res.redirect('/epsilon/nmd/uk-document');
  } else if (productEntries === 'No') {
    res.redirect('/epsilon/nmd/transport-type');
  } else {
    // ✅ Render the summary page directly if no selection
    res.render('product-summary', {
      data: {
        productEntries: req.session.data['productEntries']
      }
    });
  }
});

router.get('/epsilon/nmd/remove-product/:index', function (req, res) {
  const index = parseInt(req.params.index);
  if (!isNaN(index) && req.session.data['productEntries']) {
    req.session.data['productEntries'].splice(index, 1);
  }
  res.redirect('/epsilon/nmd/product-summary');
});


router.get('/epsilon/nmd/edit-product/:index', function (req, res) {
  const index = parseInt(req.params.index);
  const product = req.session.data['productEntries'][index];

  // Pre-fill session fields with selected product
  req.session.data['species'] = product.species;
  req.session.data['commodity-code'] = product.commodityCode;
  req.session.data['description'] = product.description;
  req.session.data['entry-document-reference'] = product.referenceNumber;
  req.session.data['productReferenceNumber'] = product.productReferenceNumber;
  req.session.data['net-weight'] = product.netWeight;
  req.session.data['fish-weight'] = product.fishWeight;

  // Store index for update later
  req.session.data['editIndex'] = index;

  res.redirect('/epsilon/nmd/product-details');
});



// Route for handling transport selection
router.post('/epsilon/nmd/transport-type', function (req, res) {
  const transportType = req.body['transport-type'];

  if (transportType === 'Truck') {
    res.redirect('/epsilon/nmd/transport-truck');
  } else if (transportType === 'Plane') {
    res.redirect('/epsilon/nmd/transport-plane');
  } else if (transportType === 'Train') {
    res.redirect('/epsilon/nmd/transport-train');
  } else if (transportType === 'Container vessel') {
    res.redirect('/epsilon/nmd/transport-container-vessel');
  } else {
    res.redirect('/epsilon/nmd/transport-type');  // Redirect back if no option selected

  }
});

// Route for handling truck transport
router.post('/epsilon/nmd/transport-truck', function (req, res) {
  req.session.data['truck-nationality'] = req.body['truck-nationality'];
  req.session.data['truck-registration'] = req.body['registration-number'];
  req.session.data['export-place'] = req.body['export-place'];
  req.session.data['freight-number'] = req.body['freight-number'];

  // Add to transportTypes array in session
  req.session.data['transportTypes'] = req.session.data['transportTypes'] || [];
  req.session.data['transportTypes'].push({
    type: 'Truck',
    truckNationality: req.body['truck-nationality'],
    truckRegistration: req.body['registration-number'],
    exportPlace: req.body['export-place'],
    freightBillNumber: req.body['freight-number']
  });
  res.redirect('/epsilon/nmd/transport-documents');
});

// Route for handling plane transport
router.post('/epsilon/nmd/transport-plane', function (req, res) {
  req.session.data['airway-bill'] = req.body['airway-bill'];
  req.session.data['flight-number'] = req.body['flight-number'];
  req.session.data['plane-departure'] = req.body['plane-departure'];
  req.session.data['container-identification'] = req.body['container-identification'];

  req.session.data['transportTypes'] = req.session.data['transportTypes'] || [];
  req.session.data['transportTypes'].push({
    type: 'Plane',
    flightNumber: req.body['flight-number'],
    planeDeparture: req.body['plane-departure'],
    airwayBill: req.body['airway-bill'],
    containerIdentification: req.body['container-identification']
  });
  res.redirect('/epsilon/nmd/transport-documents-plane');
});

// Route for handling train transport
router.post('/epsilon/nmd/transport-train', function (req, res) {
  req.session.data['railway-bill'] = req.body['railway-bill'];
  req.session.data['train-departure'] = req.body['train-departure'];
  req.session.data['freight-bill'] = req.body['freight-bill'];

  req.session.data['transportTypes'] = req.session.data['transportTypes'] || [];
  req.session.data['transportTypes'].push({
    type: 'Train',
    railwayBill: req.body['railway-bill'],
    trainDeparture: req.body['train-departure'],
    freightBillNumber: req.body['freight-bill']
  });
  res.redirect('/epsilon/nmd/transport-documents-train');
});

// Route for handling container vessel transport
router.post('/epsilon/nmd/transport-container-vessel', function (req, res) {
  req.session.data['vessel-name'] = req.body['vessel-name'];
  req.session.data['flag-state'] = req.body['flag-state'];
  req.session.data['container-vessel-departure'] = req.body['container-vessel-departure'];
  req.session.data['freight-bill'] = req.body['freight-bill'];

  req.session.data['transportTypes'] = req.session.data['transportTypes'] || [];
  req.session.data['transportTypes'].push({
    type: 'Container vessel',
    vesselName: req.body['vessel-name'],
    flagState: req.body['flag-state'],
    containerVesselDeparture: req.body['container-vessel-departure'],
    freightBillNumber: req.body['freight-bill']
  });
  res.redirect('/epsilon/nmd/transport-documents-vessel');
});


// TRUCK DOCUMENTS
router.post('/epsilon/nmd/transport-documents', function (req, res) {
  let documentNames = req.session.data['documentName[]'] || [];
  let referenceNumbers = req.session.data['referenceNumber[]'] || [];

  const names = req.body['documentName[]'] || req.body.documentName;
  const refs = req.body['referenceNumber[]'] || req.body.referenceNumber;
  const editIndex = req.body.editIndex;

  if (editIndex !== undefined && editIndex !== '') {
    documentNames[editIndex] = names;
    referenceNumbers[editIndex] = refs;
  } else {
    if (Array.isArray(names)) {
      documentNames.push(...names);
      referenceNumbers.push(...refs);
    } else {
      documentNames.push(names);
      referenceNumbers.push(refs);
    }
  }

  req.session.data['documentName[]'] = documentNames;
  req.session.data['referenceNumber[]'] = referenceNumbers;

  res.redirect('/epsilon/nmd/arrival-details');
});

// TRAIN DOCUMENTS
router.post('/epsilon/nmd/transport-documents-train', function (req, res) {
  let documentNames = req.session.data['trainDocumentName[]'] || [];
  let referenceNumbers = req.session.data['trainReferenceNumber[]'] || [];

  const names = req.body['documentName[]'] || req.body.documentName;
  const refs = req.body['referenceNumber[]'] || req.body.referenceNumber;
  const editIndex = req.body.editIndex;

  if (editIndex !== undefined && editIndex !== '') {
    documentNames[editIndex] = names;
    referenceNumbers[editIndex] = refs;
  } else {
    if (Array.isArray(names)) {
      documentNames.push(...names);
      referenceNumbers.push(...refs);
    } else {
      documentNames.push(names);
      referenceNumbers.push(refs);
    }
  }

  req.session.data['trainDocumentName[]'] = documentNames;
  req.session.data['trainReferenceNumber[]'] = referenceNumbers;

  res.redirect('/epsilon/nmd/arrival-details');
});

// PLANE DOCUMENTS
router.post('/epsilon/nmd/transport-documents-plane', function (req, res) {
  let documentNames = req.session.data['planeDocumentName[]'] || [];
  let referenceNumbers = req.session.data['planeReferenceNumber[]'] || [];

  const names = req.body['documentName[]'] || req.body.documentName;
  const refs = req.body['referenceNumber[]'] || req.body.referenceNumber;
  const editIndex = req.body.editIndex;

  if (editIndex !== undefined && editIndex !== '') {
    documentNames[editIndex] = names;
    referenceNumbers[editIndex] = refs;
  } else {
    if (Array.isArray(names)) {
      documentNames.push(...names);
      referenceNumbers.push(...refs);
    } else {
      documentNames.push(names);
      referenceNumbers.push(refs);
    }
  }

  req.session.data['planeDocumentName[]'] = documentNames;
  req.session.data['planeReferenceNumber[]'] = referenceNumbers;

  res.redirect('/epsilon/nmd/arrival-details');
});

// VESSEL DOCUMENTS
router.post('/epsilon/nmd/transport-documents-vessel', function (req, res) {
  let documentNames = req.session.data['vesselDocumentName[]'] || [];
  let referenceNumbers = req.session.data['vesselReferenceNumber[]'] || [];

  const names = req.body['documentName[]'] || req.body.documentName;
  const refs = req.body['referenceNumber[]'] || req.body.referenceNumber;
  const editIndex = req.body.editIndex;

  if (editIndex !== undefined && editIndex !== '') {
    documentNames[editIndex] = names;
    referenceNumbers[editIndex] = refs;
  } else {
    if (Array.isArray(names)) {
      documentNames.push(...names);
      referenceNumbers.push(...refs);
    } else {
      documentNames.push(names);
      referenceNumbers.push(refs);
    }
  }

  req.session.data['vesselDocumentName[]'] = documentNames;
  req.session.data['vesselReferenceNumber[]'] = referenceNumbers;

  res.redirect('/epsilon/nmd/arrival-details');
});

// Route for handling the storage facility arrival page
router.post('/epsilon/nmd/arrival-details', function (req, res) {
  req.session.data['departure-country'] = req.body['departure-country'];
    req.session.data['departure-location'] = req.body['departure-location'];
      req.session.data['storage-location'] = req.body['storage-location'];

      // Combine departure date
const departureDay = req.body['departure-date-day'];
const departureMonth = req.body['departure-date-month'];
const departureYear = req.body['departure-date-year'];
req.session.data['departure-date'] = `${departureDay}/${departureMonth}/${departureYear}`;

// Combine arrival date
const arrivalDay = req.body['arrival-date-day'];
const arrivalMonth = req.body['arrival-date-month']; // fix typo in HTML
const arrivalYear = req.body['arrival-date-year'];
req.session.data['arrival-date'] = `${arrivalDay}/${arrivalMonth}/${arrivalYear}`;

  // Add more fields as needed

  // Redirect based on which button was pressed
  if (req.body._action === 'progress' || req.body['formaction'] === 'progress') {
    res.redirect('/epsilon/nmd/progress');
  } else {
    res.redirect('/epsilon/nmd/storage-facility-details');
  }
});

// Route for storage facility details
router.post('/epsilon/nmd/storage-facility-details', function (req, res) {
  req.session.data['facility-name'] = req.body['facility-name'];
  // Add more fields as needed
  res.redirect('/epsilon/nmd/storage-facility-address');
});

// Route for storage facility details
router.post('/epsilon/nmd/storage-facility-address', function (req, res) {
  req.session.data['postcode'] = req.body['postcode'];
  // Add more fields as needed
  res.redirect('/epsilon/nmd/storage-facility-address-2');
});

// Route for storage facility address
router.post('/epsilon/nmd/storage-facility-address-2', function (req, res) {
  req.session.data['building-number'] = req.body['building-number'];
  req.session.data['building-name'] = req.body['building-name'];
  req.session.data['sub-building-name'] = req.body['sub-building-name'];
  req.session.data['street-name'] = req.body['street-name'];
  req.session.data['county'] = req.body['county'];
  req.session.data['country'] = req.body['country'];
  // Add more fields as needed
  res.redirect('/epsilon/nmd/storage-facility-confirmation');
});

// Route for storage facility confirmation
router.post('/epsilon/nmd/storage-facility-confirmation', function (req, res) {
  
  // Add more fields as needed
  res.redirect('/epsilon/nmd/storage-facility-approval');
});


// Route for storage facility approval
// Route for storage facility approval
router.post('/epsilon/nmd/storage-facility-approval', function (req, res) {
  let storageTypes = [].concat(req.body['product-storage'] || []);
  storageTypes = storageTypes.filter(item => item !== '_unchecked');
  req.session.data['product-storage'] = storageTypes;
  res.redirect('/epsilon/nmd/storage-facility-summary');
});



// Route for storage facility summary
router.post('/epsilon/nmd/storage-facility-summary', function (req, res) {
  // Get current values from session
  const facilityName = req.session.data['facility-name'];
  const addAnother = req.body['storage-facility']; // Yes or No

  // Create a new facility entry
  const newFacility = {
    name: facilityName,
  };

  // Save to session array
  if (!req.session.data['storageFacilities']) {
    req.session.data['storageFacilities'] = [];
  }

  req.session.data['storageFacilities'].push(newFacility);

  // Redirect based on user choice
  if (addAnother === 'Yes') {
    res.redirect('/epsilon/nmd/storage-facility-details');
  } else if (addAnother === 'No') {
    res.redirect('/epsilon/nmd/departure-summary');
  } else {
    res.redirect('/epsilon/nmd/storage-facility-summary');
  }
});

// Route for departure details
router.post('/epsilon/nmd/departure-details', function (req, res) {
  // Capture date parts
  const day = req.body['departure-date-uk-day'];
  const month = req.body['departure-date-uk-month'];
  const year = req.body['departure-date-uk-year'];

  // Combine into a single date string (optional formatting)
  const departureDate = `${day}/${month}/${year}`;
  req.session.data['departure-date-uk'] = departureDate;

  // Capture departure location
  req.session.data['departure-location-uk'] = req.body['departure-location-uk'];

  // Redirect to the next step
  res.redirect('/epsilon/nmd/departure-destination');
});


// Route for departure summary
router.post('/epsilon/nmd/departure-summary', function (req, res) {
  const productEntries = req.session.data['productEntries'];

  if (productEntries && Array.isArray(productEntries)) {
    productEntries.forEach((entry, index) => {
      const netWeightKey = `departure-net-weight-${index}`;
      const fishWeightKey = `departure-fish-weight-${index}`;

      entry.departureNetWeight = req.body[netWeightKey];
      entry.departureFishWeight = req.body[fishWeightKey];
    });
  }

  res.redirect('/epsilon/nmd/departure-details');
});


// Route for consignment destination
router.post('/epsilon/nmd/departure-destination', function (req, res) {
  // Capture the destination country
  const destinationCountry = req.body['departure-destination-country'];

  // Save to session
  req.session.data['departure-destination-country'] = destinationCountry;

  // Redirect to the next step in the journey
  res.redirect('/epsilon/nmd/departure-transport-type');
});

router.post('/epsilon/nmd/departure-transport-type', function (req, res) {
  const transportType = req.body['departure-transport-type'];

  if (transportType === 'Truck') {
    res.redirect('/epsilon/nmd/departure-transport-truck');
  } else if (transportType === 'Plane') {
    res.redirect('/epsilon/nmd/departure-transport-plane');
  } else if (transportType === 'Train') {
    res.redirect('/epsilon/nmd/departure-transport-train');
  } else if (transportType === 'Container vessel') {
    res.redirect('/epsilon/nmd/departure-transport-container-vessel');
  } else {
    res.redirect('/epsilon/nmd/departure-transport-type');
  }
});

router.post('/epsilon/nmd/departure-transport-truck', function (req, res) {
  req.session.data['departure-truck-nationality'] = req.body['truck-nationality'];
  req.session.data['departure-truck-registration'] = req.body['registration-number'];
  req.session.data['departure-export-place'] = req.body['export-place'];
  req.session.data['departure-freight-number'] = req.body['freight-number'];

  res.redirect('/epsilon/nmd/departure-transport-documents');
});

router.post('/epsilon/nmd/departure-transport-plane', function (req, res) {
  req.session.data['departure-airway-bill'] = req.body['airway-bill'];
  req.session.data['departure-flight-number'] = req.body['flight-number'];
  req.session.data['departure-plane-departure'] = req.body['plane-departure'];
  req.session.data['departure-container-identification'] = req.body['container-identification'];

  res.redirect('/epsilon/nmd/departure-transport-documents-plane');
});

router.post('/epsilon/nmd/departure-transport-train', function (req, res) {
  req.session.data['departure-railway-bill'] = req.body['railway-bill'];
  req.session.data['departure-train-departure'] = req.body['train-departure'];
  req.session.data['departure-freight-bill'] = req.body['freight-bill'];

  res.redirect('/epsilon/nmd/departure-transport-documents-train');
});

router.post('/epsilon/nmd/departure-transport-container-vessel', function (req, res) {
  req.session.data['departure-vessel-name'] = req.body['vessel-name'];
  req.session.data['departure-flag-state'] = req.body['flag-state'];
  req.session.data['departure-container-vessel-departure'] = req.body['container-vessel-departure'];
  req.session.data['departure-freight-bill'] = req.body['departure-freight-bill'];

  res.redirect('/epsilon/nmd/departure-transport-documents-vessel');
});

router.post('/epsilon/nmd/departure-transport-documents', function (req, res) {
  let documentNames = req.session.data['departure-documentName[]'] || [];
  let referenceNumbers = req.session.data['departure-referenceNumber[]'] || [];

  const names = req.body['documentName[]'] || req.body.documentName;
  const refs = req.body['referenceNumber[]'] || req.body.referenceNumber;
  const editIndex = req.body.editIndex;

  if (editIndex !== undefined && editIndex !== '') {
    documentNames[editIndex] = names;
    referenceNumbers[editIndex] = refs;
  } else {
    if (Array.isArray(names)) {
      documentNames.push(...names);
      referenceNumbers.push(...refs);
    } else {
      documentNames.push(names);
      referenceNumbers.push(refs);
    }
  }

  req.session.data['departure-documentName[]'] = documentNames;
  req.session.data['departure-referenceNumber[]'] = referenceNumbers;

  res.redirect('/epsilon/nmd/progress');
});

router.post('/epsilon/nmd/departure-transport-documents-plane', function (req, res) {
  let documentNames = req.session.data['departure-planeDocumentName[]'] || [];
  let referenceNumbers = req.session.data['departure-planeReferenceNumber[]'] || [];

  const names = req.body['documentName[]'] || req.body.documentName;
  const refs = req.body['referenceNumber[]'] || req.body.referenceNumber;
  const editIndex = req.body.editIndex;

  if (editIndex !== undefined && editIndex !== '') {
    documentNames[editIndex] = names;
    referenceNumbers[editIndex] = refs;
  } else {
    if (Array.isArray(names)) {
      documentNames.push(...names);
      referenceNumbers.push(...refs);
    } else {
      documentNames.push(names);
      referenceNumbers.push(refs);
    }
  }

  req.session.data['departure-planeDocumentName[]'] = documentNames;
  req.session.data['departure-planeReferenceNumber[]'] = referenceNumbers;

  res.redirect('/epsilon/nmd/progress');
});

router.post('/epsilon/nmd/departure-transport-documents-train', function (req, res) {
  let documentNames = req.session.data['departure-trainDocumentName[]'] || [];
  let referenceNumbers = req.session.data['departure-trainReferenceNumber[]'] || [];

  const names = req.body['documentName[]'] || req.body.documentName;
  const refs = req.body['referenceNumber[]'] || req.body.referenceNumber;
  const editIndex = req.body.editIndex;

  if (editIndex !== undefined && editIndex !== '') {
    documentNames[editIndex] = names;
    referenceNumbers[editIndex] = refs;
  } else {
    if (Array.isArray(names)) {
      documentNames.push(...names);
      referenceNumbers.push(...refs);
    } else {
      documentNames.push(names);
      referenceNumbers.push(refs);
    }
  }

  req.session.data['departure-trainDocumentName[]'] = documentNames;
  req.session.data['departure-trainReferenceNumber[]'] = referenceNumbers;

  res.redirect('/epsilon/nmd/progress');
});

router.post('/epsilon/nmd/departure-transport-documents-vessel', function (req, res) {
  let documentNames = req.session.data['departure-vesselDocumentName[]'] || [];
  let referenceNumbers = req.session.data['departure-vesselReferenceNumber[]'] || [];

  const names = req.body['documentName[]'] || req.body.documentName;
  const refs = req.body['referenceNumber[]'] || req.body.referenceNumber;
  const editIndex = req.body.editIndex;

  if (editIndex !== undefined && editIndex !== '') {
    documentNames[editIndex] = names;
    referenceNumbers[editIndex] = refs;
  } else {
    if (Array.isArray(names)) {
      documentNames.push(...names);
      referenceNumbers.push(...refs);
    } else {
      documentNames.push(names);
      referenceNumbers.push(refs);
    }
  }

  req.session.data['departure-vesselDocumentName[]'] = documentNames;
  req.session.data['departure-vesselReferenceNumber[]'] = referenceNumbers;

  res.redirect('/epsilon/nmd/progress');
});


router.get('/epsilon/nmd/progress', function (req, res) {
  res.render('epsilon/nmd/progress.html', {
    data: req.session.data
  });
});
router.post('/epsilon/nmd/progress', function (req, res) {
  // Handle the progress form submission
  const action = req.body._action || req.body.formaction;

  if (action === 'progress') {
    // Redirect to the next step in the journey
    res.redirect('/epsilon/nmd/check-your-answers');
  } else {
    // Redirect to the previous step or stay on the same page
    res.redirect('/epsilon/nmd/progress');
  }
});


// Route for handling the 'Your reference' page
router.post('/epsilon/sd/your-reference', function (req, res) {
  req.session.data['your-reference'] = req.body['your-reference'];
  // Add more fields as needed

  // Redirect based on which button was pressed
  if (req.body._action === 'progress' || req.body['formaction'] === 'progress') {
    res.redirect('/epsilon/sd/progress');
  } else {
    res.redirect('/epsilon/sd/exporter-details');
  }
});

// Route for exporter details
router.post('/epsilon/sd/exporter-details', function (req, res) {
  req.session.data['company-name'] = req.body['company-name']
  // Add more fields as needed
  res.redirect('/epsilon/sd/product-details')
})

// GET handler for epsilon/sd/product-details
router.get('/epsilon/sd/product-details', function (req, res) {
  res.render('epsilon/sd/product-details', { data: req.session.data });
  delete req.session.data['formErrors'];
});

// Route for product details
router.post('/epsilon/sd/product-details', function (req, res) {
  // Validation for weight fields
  const errors = [];

  if (!req.body['entry-weight'] || req.body['entry-weight'] === '') {
    errors.push({
      fieldName: 'entry-weight',
      message: 'Enter the weight on the document in kg'
    });
  }

  if (!req.body['net-weight'] || req.body['net-weight'] === '') {
    errors.push({
      fieldName: 'net-weight',
      message: 'Enter the net weight of product on arrival'
    });
  }

  if (!req.body['fish-weight'] || req.body['fish-weight'] === '') {
    errors.push({
      fieldName: 'fish-weight',
      message: 'Enter the net weight of fishery products on arrival'
    });
  }

  // Check that fish-weight does not exceed net-weight
  if (req.body['fish-weight'] && req.body['net-weight']) {
    if (parseFloat(req.body['fish-weight']) > parseFloat(req.body['net-weight'])) {
      errors.push({
        fieldName: 'fish-weight',
        message: 'Fishery products net weight on arrival cannot exceed the product net weight on arrival'
      });
    }
  }

  if (errors.length > 0) {
    req.session.data['formErrors'] = errors;
    return res.redirect('/epsilon/sd/product-details');
  }

  const newEntry = {
    ukDocument: req.body['uk-document'], // now collected here
    issuingCountry: req.body['issuing-country'], // <-- add this line
    entryDocumentReference: req.body['entry-document-reference'], // now collected here
    entryWeight: req.body['entry-weight'], // <-- add this line
    species: req.body['species'],
    commodityCode: req.body['commodity-code'],
    description: req.body['description'],
    productReferenceNumber: req.body['productReferenceNumber'],
    netWeight: req.body['net-weight'],
    fishWeight: req.body['fish-weight']
  };

  if (!req.session.data['productEntries']) {
    req.session.data['productEntries'] = [];
  }

  const editIndex = req.session.data['editIndex'];

  if (typeof editIndex !== 'undefined') {
    req.session.data['productEntries'][editIndex] = newEntry;
    delete req.session.data['editIndex'];
  } else {
    req.session.data['productEntries'].push(newEntry);
  }

  // Clear fields and errors
  req.session.data['uk-document'] = '';
  req.session.data['issuing-country'] = '';
  req.session.data['entry-document-reference'] = '';
  req.session.data['entry-weight'] = '';
  req.session.data['species'] = '';
  req.session.data['commodity-code'] = '';
  req.session.data['description'] = '';
  req.session.data['productReferenceNumber'] = '';
  req.session.data['net-weight'] = '';
  req.session.data['fish-weight'] = '';
  delete req.session.data['formErrors'];

  res.redirect('/epsilon/sd/product-summary');
});




// GET handler for epsilon/sd/product-summary
router.get('/epsilon/sd/product-summary', function (req, res) {
  res.render('epsilon/sd/product-summary', { data: req.session.data });
});

// Route for product summary
router.post('/epsilon/sd/product-summary', function (req, res) {
  // Clear single-entry fields
  req.session.data['uk-document'] = '';
  req.session.data['issuing-country'] = '';
  req.session.data['entry-document-reference'] = '';
  req.session.data['entry-weight'] = '';
  req.session.data['productReferenceNumber'] = '';
  req.session.data['species'] = '';
  req.session.data['commodity-code'] = '';
  req.session.data['description'] = '';
  req.session.data['net-weight'] = '';
  req.session.data['fish-weight'] = '';
  delete req.session.data['editIndex'];

  req.session.data['more-products'] = req.body['more-products'];

  const productEntries = req.body['more-products'];

  if (productEntries === 'Yes') {
    res.redirect('/epsilon/sd/product-details'); // ✅ stays in SD flow
  } else if (productEntries === 'No') {
    res.redirect('/epsilon/sd/transport-type');
  } else {
    // ✅ No selection made — redirect to GET route
    res.redirect('/epsilon/sd/product-summary');
  }
});

router.get('/epsilon/sd/edit-product/:index', function (req, res) {
  const index = parseInt(req.params.index);
  const product = req.session.data['productEntries'][index];

  // Pre-fill session fields with selected product
  req.session.data['uk-document'] = product.ukDocument;
  req.session.data['issuing-country'] = product.issuingCountry;
  req.session.data['entry-document-reference'] = product.entryDocumentReference;
  req.session.data['entry-weight'] = product.entryWeight;
  req.session.data['productReferenceNumber'] = product.productReferenceNumber;
  req.session.data['species'] = product.species;
  req.session.data['commodity-code'] = product.commodityCode;
  req.session.data['description'] = product.description;
  req.session.data['net-weight'] = product.netWeight;
  req.session.data['fish-weight'] = product.fishWeight;

  // Store index for update later
  req.session.data['editIndex'] = index;

  res.redirect('/epsilon/sd/product-details');
});


router.get('/epsilon/sd/remove-product/:index', function (req, res) {
  const index = parseInt(req.params.index);
  if (!isNaN(index) && req.session.data['productEntries']) {
    req.session.data['productEntries'].splice(index, 1);
  }
  res.redirect('/epsilon/sd/product-summary');
});



// Route for handling transport selection
router.post('/epsilon/sd/transport-type', function (req, res) {
  const transportType = req.body['transport-type'];

  if (transportType === 'Truck') {
    res.redirect('/epsilon/sd/transport-truck');
  } else if (transportType === 'Plane') {
    res.redirect('/epsilon/sd/transport-plane');
  } else if (transportType === 'Train') {
    res.redirect('/epsilon/sd/transport-train');
  } else if (transportType === 'Container vessel') {
    res.redirect('/epsilon/sd/transport-container-vessel');
  } else {
    res.redirect('/epsilon/sd/transport-type');  // Redirect back if no option selected

  }
});

// Route for handling truck transport
router.post('/epsilon/sd/transport-truck', function (req, res) {
  req.session.data['departure-country'] = req.body['departure-country'];
  req.session.data['truck-nationality'] = req.body['truck-nationality'];
  req.session.data['truck-registration'] = req.body['registration-number'];
  req.session.data['export-place'] = req.body['export-place'];
  req.session.data['unloading-place'] = req.body['unloading-place'];
  req.session.data['freight-number'] = req.body['freight-number'];

        // Combine departure date
const departureDay = req.body['departure-date-day'];
const departureMonth = req.body['departure-date-month'];
const departureYear = req.body['departure-date-year'];
req.session.data['departure-date'] = `${departureDay}/${departureMonth}/${departureYear}`;

  // Add to transportTypes array in session
  req.session.data['transportTypes'] = req.session.data['transportTypes'] || [];
  req.session.data['transportTypes'].push({
    type: 'Truck',
    departureCountry: req.body['departure-country'],
    truckNationality: req.body['truck-nationality'],
    truckRegistration: req.body['registration-number'],
    exportPlace: req.body['export-place'],
    unloadingPlace: req.body['unloading-place'],
    freightBillNumber: req.body['freight-number'],
    departureDate: req.session.data['departure-date']
  });
  res.redirect('/epsilon/sd/transport-documents');
});

// Route for handling plane transport
router.post('/epsilon/sd/transport-plane', function (req, res) {
  req.session.data['plane-departure-country'] = req.body['plane-departure-country'];
  req.session.data['unloading-place-plane'] = req.body['unloading-place-plane'];
  req.session.data['airway-bill'] = req.body['airway-bill'];
  req.session.data['flight-number'] = req.body['flight-number'];
  req.session.data['plane-departure'] = req.body['plane-departure'];
  req.session.data['container-identification'] = req.body['container-identification'];

          // Combine plane departure date
  const departureDay = req.body['plane-departure-date-day'];
  const departureMonth = req.body['plane-departure-date-month'];
  const departureYear = req.body['plane-departure-date-year'];
  req.session.data['plane-departure-date'] = `${departureDay}/${departureMonth}/${departureYear}`;

  req.session.data['transportTypes'] = req.session.data['transportTypes'] || [];
  req.session.data['transportTypes'].push({
    type: 'Plane',
    planeDepartureCountry: req.body['plane-departure-country'],
    flightNumber: req.body['flight-number'],
    planeDeparture: req.body['plane-departure'],
    airwayBill: req.body['airway-bill'],
    unloadingPlacePlane: req.body['unloading-place-plane'],
    containerIdentification: req.body['container-identification'],
    planeDepartureDate: req.session.data['plane-departure-date']
  });
  res.redirect('/epsilon/sd/transport-documents-plane');
});

// Route for handling train transport
router.post('/epsilon/sd/transport-train', function (req, res) {
  req.session.data['train-departure-country'] = req.body['train-departure-country'];
  req.session.data['railway-bill'] = req.body['railway-bill'];
  req.session.data['train-departure'] = req.body['train-departure'];
  req.session.data['unloading-place-train'] = req.body['unloading-place-train'];
  req.session.data['freight-bill'] = req.body['freight-bill'];

      // Combine train departure date
  const departureDay = req.body['train-departure-date-day'];
  const departureMonth = req.body['train-departure-date-month'];
  const departureYear = req.body['train-departure-date-year'];
  req.session.data['train-departure-date'] = `${departureDay}/${departureMonth}/${departureYear}`;

  req.session.data['transportTypes'] = req.session.data['transportTypes'] || [];
  req.session.data['transportTypes'].push({
    type: 'Train',
    trainDepartureCountry: req.body['train-departure-country'],
    railwayBill: req.body['railway-bill'],
    trainDeparture: req.body['train-departure'],
    unloadingPlaceTrain: req.body['unloading-place-train'],
    freightBillNumber: req.body['freight-bill'],
    trainDepartureDate: req.session.data['train-departure-date']
  });
  res.redirect('/epsilon/sd/transport-documents-train');
});

// Route for handling container vessel transport
router.post('/epsilon/sd/transport-container-vessel', function (req, res) {
  req.session.data['container-vessel-departure-country'] = req.body['container-vessel-departure-country'];
  req.session.data['unloading-place-vessel'] = req.body['unloading-place-vessel'];
  req.session.data['vessel-name'] = req.body['vessel-name'];
  req.session.data['flag-state'] = req.body['flag-state'];
  req.session.data['container-vessel-departure'] = req.body['container-vessel-departure'];
  req.session.data['freight-bill'] = req.body['freight-bill'];

      // Combine container vessel departure date
  const departureDay = req.body['container-vessel-departure-date-day'];
  const departureMonth = req.body['container-vessel-departure-date-month'];
  const departureYear = req.body['container-vessel-departure-date-year'];
  req.session.data['container-vessel-departure-date'] = `${departureDay}/${departureMonth}/${departureYear}`;

  req.session.data['transportTypes'] = req.session.data['transportTypes'] || [];
  req.session.data['transportTypes'].push({
    type: 'Container vessel',
    containerVesselDepartureCountry: req.body['container-vessel-departure-country'],
    vesselName: req.body['vessel-name'],
    flagState: req.body['flag-state'],
    unloadingPlaceVessel: req.body['unloading-place-vessel'],
    containerVesselDeparture: req.body['container-vessel-departure'],
    freightBillNumber: req.body['freight-bill'],
    containerVesselDepartureDate: req.session.data['container-vessel-departure-date']
  });
  res.redirect('/epsilon/sd/transport-documents-vessel');
});


// TRUCK DOCUMENTS
router.post('/epsilon/sd/transport-documents', function (req, res) {
  let documentNames = req.session.data['documentName[]'] || [];
  let referenceNumbers = req.session.data['referenceNumber[]'] || [];

  const names = req.body['documentName[]'] || req.body.documentName;
  const refs = req.body['referenceNumber[]'] || req.body.referenceNumber;
  const editIndex = req.body.editIndex;

  if (editIndex !== undefined && editIndex !== '') {
    documentNames[editIndex] = names;
    referenceNumbers[editIndex] = refs;
  } else {
    if (Array.isArray(names)) {
      documentNames.push(...names);
      referenceNumbers.push(...refs);
    } else {
      documentNames.push(names);
      referenceNumbers.push(refs);
    }
  }

  req.session.data['documentName[]'] = documentNames;
  req.session.data['referenceNumber[]'] = referenceNumbers;

  res.redirect('/epsilon/sd/storage-facility-details');
});

// TRAIN DOCUMENTS
router.post('/epsilon/sd/transport-documents-train', function (req, res) {
  let documentNames = req.session.data['trainDocumentName[]'] || [];
  let referenceNumbers = req.session.data['trainReferenceNumber[]'] || [];

  const names = req.body['documentName[]'] || req.body.documentName;
  const refs = req.body['referenceNumber[]'] || req.body.referenceNumber;
  const editIndex = req.body.editIndex;

  if (editIndex !== undefined && editIndex !== '') {
    documentNames[editIndex] = names;
    referenceNumbers[editIndex] = refs;
  } else {
    if (Array.isArray(names)) {
      documentNames.push(...names);
      referenceNumbers.push(...refs);
    } else {
      documentNames.push(names);
      referenceNumbers.push(refs);
    }
  }

  req.session.data['trainDocumentName[]'] = documentNames;
  req.session.data['trainReferenceNumber[]'] = referenceNumbers;

  res.redirect('/epsilon/sd/storage-facility-details');
});

// PLANE DOCUMENTS
router.post('/epsilon/sd/transport-documents-plane', function (req, res) {
  let documentNames = req.session.data['planeDocumentName[]'] || [];
  let referenceNumbers = req.session.data['planeReferenceNumber[]'] || [];

  const names = req.body['documentName[]'] || req.body.documentName;
  const refs = req.body['referenceNumber[]'] || req.body.referenceNumber;
  const editIndex = req.body.editIndex;

  if (editIndex !== undefined && editIndex !== '') {
    documentNames[editIndex] = names;
    referenceNumbers[editIndex] = refs;
  } else {
    if (Array.isArray(names)) {
      documentNames.push(...names);
      referenceNumbers.push(...refs);
    } else {
      documentNames.push(names);
      referenceNumbers.push(refs);
    }
  }

  req.session.data['planeDocumentName[]'] = documentNames;
  req.session.data['planeReferenceNumber[]'] = referenceNumbers;

  res.redirect('/epsilon/sd/storage-facility-details');
});

// VESSEL DOCUMENTS
router.post('/epsilon/sd/transport-documents-vessel', function (req, res) {
  let documentNames = req.session.data['vesselDocumentName[]'] || [];
  let referenceNumbers = req.session.data['vesselReferenceNumber[]'] || [];

  const names = req.body['documentName[]'] || req.body.documentName;
  const refs = req.body['referenceNumber[]'] || req.body.referenceNumber;
  const editIndex = req.body.editIndex;

  if (editIndex !== undefined && editIndex !== '') {
    documentNames[editIndex] = names;
    referenceNumbers[editIndex] = refs;
  } else {
    if (Array.isArray(names)) {
      documentNames.push(...names);
      referenceNumbers.push(...refs);
    } else {
      documentNames.push(names);
      referenceNumbers.push(refs);
    }
  }

  req.session.data['vesselDocumentName[]'] = documentNames;
  req.session.data['vesselReferenceNumber[]'] = referenceNumbers;

  res.redirect('/epsilon/sd/storage-facility-details');
});


// Route for storage facility details
router.post('/epsilon/sd/storage-facility-details', function (req, res) {
  req.session.data['facility-name'] = req.body['facility-name'];

  // Combine arrival date
const arrivalDay = req.body['arrival-date-day'];
const arrivalMonth = req.body['arrival-date-month']; // fix typo in HTML
const arrivalYear = req.body['arrival-date-year'];
req.session.data['arrival-date'] = `${arrivalDay}/${arrivalMonth}/${arrivalYear}`;
  // Add more fields as needed
  res.redirect('/epsilon/sd/storage-facility-address');
});

// Route for storage facility details
router.post('/epsilon/sd/storage-facility-address', function (req, res) {
  req.session.data['postcode'] = req.body['postcode'];
  // Add more fields as needed
  res.redirect('/epsilon/sd/storage-facility-address-2');
});

// Route for storage facility address
router.post('/epsilon/sd/storage-facility-address-2', function (req, res) {
  req.session.data['building-number'] = req.body['building-number'];
  req.session.data['building-name'] = req.body['building-name'];
  req.session.data['sub-building-name'] = req.body['sub-building-name'];
  req.session.data['street-name'] = req.body['street-name'];
  req.session.data['county'] = req.body['county'];
  req.session.data['country'] = req.body['country'];
  // Add more fields as needed
  res.redirect('/epsilon/sd/storage-facility-confirmation');
});

// Route for storage facility confirmation
router.post('/epsilon/sd/storage-facility-confirmation', function (req, res) {
  
  // Add more fields as needed
  res.redirect('/epsilon/sd/storage-facility-approval');
});

// Route for storage facility approval
router.post('/epsilon/sd/storage-facility-approval', function (req, res) {
  let storageTypes = [].concat(req.body['product-storage'] || []);
  storageTypes = storageTypes.filter(item => item !== '_unchecked');
  req.session.data['product-storage'] = storageTypes;
  res.redirect('/epsilon/sd/departure-transport-type');
});



// Route for storage facility summary
router.post('/epsilon/sd/storage-facility-summary', function (req, res) {
  // Get current values from session
  const facilityName = req.session.data['facility-name'];
  const addAnother = req.body['storage-facility']; // Yes or No

  // Create a new facility entry
  const newFacility = {
    name: facilityName,
  };

  // Save to session array
  if (!req.session.data['storageFacilities']) {
    req.session.data['storageFacilities'] = [];
  }

  req.session.data['storageFacilities'].push(newFacility);

  // Redirect based on user choice
  if (addAnother === 'Yes') {
    res.redirect('/epsilon/sd/storage-facility-details');
  } else if (addAnother === 'No') {
    res.redirect('/epsilon/sd/departure-transport-type');
  } else {
    res.redirect('/epsilon/sd/storage-facility-summary');
  }
});

// Route for departure transport details
router.post('/epsilon/sd/departure-transport-type', function (req, res) {
  const transportType = req.body['departure-transport-type'];

  if (transportType === 'Truck') {
    res.redirect('/epsilon/sd/departure-transport-truck');
  } else if (transportType === 'Plane') {
    res.redirect('/epsilon/sd/departure-transport-plane');
  } else if (transportType === 'Train') {
    res.redirect('/epsilon/sd/departure-transport-train');
  } else if (transportType === 'Container vessel') {
    res.redirect('/epsilon/sd/departure-transport-container-vessel');
  } else {
    res.redirect('/epsilon/sd/departure-transport-type');
  }
});


router.post('/epsilon/sd/departure-transport-truck', function (req, res) {
  req.session.data['departure-destination-country'] = req.body['departure-destination-country'];
  req.session.data['destination-point-truck'] = req.body['destination-point-truck'];
  req.session.data['departure-truck-nationality'] = req.body['truck-nationality'];
  req.session.data['departure-truck-registration'] = req.body['registration-number'];
  req.session.data['departure-export-place'] = req.body['export-place'];
  req.session.data['departure-freight-number'] = req.body['freight-number'];
  req.session.data['container-identification-truck'] = req.body['container-identification-truck']; 


  const destinationCountry = req.body['departure-destination-country'];

  // Capture date parts
  const day = req.body['departure-date-uk-day'];
  const month = req.body['departure-date-uk-month'];
  const year = req.body['departure-date-uk-year'];

  // Combine into a single date string (optional formatting)
  const departureDate = `${day}/${month}/${year}`;
  req.session.data['departure-date-uk'] = departureDate;
  

  res.redirect('/epsilon/sd/departure-transport-documents');
});

router.post('/epsilon/sd/departure-transport-plane', function (req, res) {
  req.session.data['plane-departure-destination-country'] = req.body['plane-departure-destination-country'];
  req.session.data['destination-point-plane'] = req.body['destination-point-plane'];
  req.session.data['departure-airway-bill'] = req.body['airway-bill'];
  req.session.data['departure-flight-number'] = req.body['flight-number'];
  req.session.data['departure-plane-departure'] = req.body['plane-departure'];
  req.session.data['departure-container-identification'] = req.body['container-identification'];

    // Capture date parts
  const day = req.body['plane-departure-date-uk-day'];
  const month = req.body['plane-departure-date-uk-month'];
  const year = req.body['plane-departure-date-uk-year'];

  // Combine into a single date string (optional formatting)
  const departureDate = `${day}/${month}/${year}`;
  req.session.data['plane-departure-date-uk'] = departureDate;

  res.redirect('/epsilon/sd/departure-transport-documents-plane');
});

router.post('/epsilon/sd/departure-transport-train', function (req, res) {
  req.session.data['train-departure-destination-country'] = req.body['train-departure-destination-country'];
  req.session.data['destination-point-train'] = req.body['destination-point-train'];
  req.session.data['departure-railway-bill'] = req.body['railway-bill'];
  req.session.data['departure-train-departure'] = req.body['train-departure'];
  req.session.data['departure-freight-bill'] = req.body['freight-bill'];
  req.session.data['container-identification-train'] = req.body['container-identification-train']; 

      // Capture date parts
  const day = req.body['train-departure-date-uk-day'];
  const month = req.body['train-departure-date-uk-month'];
  const year = req.body['train-departure-date-uk-year'];
  const departureDate = `${day}/${month}/${year}`;
  req.session.data['train-departure-date-uk'] = departureDate;

  res.redirect('/epsilon/sd/departure-transport-documents-train');
});

router.post('/epsilon/sd/departure-transport-container-vessel', function (req, res) {
  req.session.data['container-vessel-departure-destination-country'] = req.body['container-vessel-departure-destination-country'];
  req.session.data['destination-point-vessel'] = req.body['destination-point-vessel'];
  req.session.data['departure-vessel-name'] = req.body['vessel-name'];
  req.session.data['departure-flag-state'] = req.body['flag-state'];
  req.session.data['departure-container-vessel-departure'] = req.body['container-vessel-departure'];
  req.session.data['departure-freight-bill'] = req.body['departure-freight-bill'];

      // Capture date parts
  const day = req.body['container-vessel-departure-date-uk-day'];
  const month = req.body['container-vessel-departure-date-uk-month'];
  const year = req.body['container-vessel-departure-date-uk-year'];
  const departureDate = `${day}/${month}/${year}`;
  req.session.data['container-vessel-departure-date-uk'] = departureDate;

  res.redirect('/epsilon/sd/departure-transport-documents-vessel');
});

router.post('/epsilon/sd/departure-transport-documents', function (req, res) {
  let documentNames = req.session.data['departure-documentName[]'] || [];
  let referenceNumbers = req.session.data['departure-referenceNumber[]'] || [];

  const names = req.body['documentName[]'] || req.body.documentName;
  const refs = req.body['referenceNumber[]'] || req.body.referenceNumber;
  const editIndex = req.body.editIndex;

  if (editIndex !== undefined && editIndex !== '') {
    documentNames[editIndex] = names;
    referenceNumbers[editIndex] = refs;
  } else {
    if (Array.isArray(names)) {
      documentNames.push(...names);
      referenceNumbers.push(...refs);
    } else {
      documentNames.push(names);
      referenceNumbers.push(refs);
    }
  }

  req.session.data['departure-documentName[]'] = documentNames;
  req.session.data['departure-referenceNumber[]'] = referenceNumbers;

  res.redirect('/epsilon/sd/departure-summary');
});

router.post('/epsilon/sd/departure-transport-documents-plane', function (req, res) {
  let documentNames = req.session.data['departure-planeDocumentName[]'] || [];
  let referenceNumbers = req.session.data['departure-planeReferenceNumber[]'] || [];

  const names = req.body['documentName[]'] || req.body.documentName;
  const refs = req.body['referenceNumber[]'] || req.body.referenceNumber;
  const editIndex = req.body.editIndex;

  if (editIndex !== undefined && editIndex !== '') {
    documentNames[editIndex] = names;
    referenceNumbers[editIndex] = refs;
  } else {
    if (Array.isArray(names)) {
      documentNames.push(...names);
      referenceNumbers.push(...refs);
    } else {
      documentNames.push(names);
      referenceNumbers.push(refs);
    }
  }

  req.session.data['departure-planeDocumentName[]'] = documentNames;
  req.session.data['departure-planeReferenceNumber[]'] = referenceNumbers;

  res.redirect('/epsilon/sd/departure-summary');
});

router.post('/epsilon/sd/departure-transport-documents-train', function (req, res) {
  let documentNames = req.session.data['departure-trainDocumentName[]'] || [];
  let referenceNumbers = req.session.data['departure-trainReferenceNumber[]'] || [];

  const names = req.body['documentName[]'] || req.body.documentName;
  const refs = req.body['referenceNumber[]'] || req.body.referenceNumber;
  const editIndex = req.body.editIndex;

  if (editIndex !== undefined && editIndex !== '') {
    documentNames[editIndex] = names;
    referenceNumbers[editIndex] = refs;
  } else {
    if (Array.isArray(names)) {
      documentNames.push(...names);
      referenceNumbers.push(...refs);
    } else {
      documentNames.push(names);
      referenceNumbers.push(refs);
    }
  }

  req.session.data['departure-trainDocumentName[]'] = documentNames;
  req.session.data['departure-trainReferenceNumber[]'] = referenceNumbers;

  res.redirect('/epsilon/sd/departure-summary');
});

router.post('/epsilon/sd/departure-transport-documents-vessel', function (req, res) {
  let documentNames = req.session.data['departure-vesselDocumentName[]'] || [];
  let referenceNumbers = req.session.data['departure-vesselReferenceNumber[]'] || [];

  const names = req.body['documentName[]'] || req.body.documentName;
  const refs = req.body['referenceNumber[]'] || req.body.referenceNumber;
  const editIndex = req.body.editIndex;

  if (editIndex !== undefined && editIndex !== '') {
    documentNames[editIndex] = names;
    referenceNumbers[editIndex] = refs;
  } else {
    if (Array.isArray(names)) {
      documentNames.push(...names);
      referenceNumbers.push(...refs);
    } else {
      documentNames.push(names);
      referenceNumbers.push(refs);
    }
  }

  req.session.data['departure-vesselDocumentName[]'] = documentNames;
  req.session.data['departure-vesselReferenceNumber[]'] = referenceNumbers;

  res.redirect('/epsilon/sd/departure-summary');
});


router.get('/epsilon/sd/progress', function (req, res) {
  res.render('epsilon/sd/progress.html', {
    data: req.session.data
  });
});

// Route for departure summary
router.post('/epsilon/sd/departure-summary', function (req, res) {
  const productEntries = req.session.data['productEntries'];

  if (productEntries && Array.isArray(productEntries)) {
    productEntries.forEach((entry, index) => {
      const netWeightKey = `departure-net-weight-${index}`;
      const fishWeightKey = `departure-fish-weight-${index}`;

      entry.departureNetWeight = req.body[netWeightKey];
      entry.departureFishWeight = req.body[fishWeightKey];
    });
  }

  res.redirect('/epsilon/sd/progress');
});

router.post('/epsilon/sd/progress', function (req, res) {
  // Handle the progress form submission
  const action = req.body._action || req.body.formaction;

  if (action === 'progress') {
    // Redirect to the next step in the journey
    res.redirect('/epsilon/sd/check-your-answers');
  } else {
    // Redirect to the previous step or stay on the same page
    res.redirect('/epsilon/sd/progress');
  }
});

// Route for handling the 'Your reference' page
router.post('/epsilon/ps/your-reference', function (req, res) {
  req.session.data['your-reference'] = req.body['your-reference'];
  // Add more fields as needed

  // Redirect based on which button was pressed
  if (req.body._action === 'progress' || req.body['formaction'] === 'progress') {
    res.redirect('/epsilon/ps/progress');
  } else {
    res.redirect('/epsilon/ps/exporter-details');
  }
});

// Route for exporter details
router.post('/epsilon/ps/exporter-details', function (req, res) {
  req.session.data['company-name'] = req.body['company-name']
  // Add more fields as needed
  res.redirect('/epsilon/ps/product-description')
})

// GET route for product description
router.get('/epsilon/ps/product-description', function (req, res) {
  res.render('epsilon/ps/product-description', {
    data: req.session.data || {},
    removeMode: req.session.data['removeMode'] || false,
    removeIndex: req.session.data['removeIndex']
  });
});

// Route for product description
router.post('/epsilon/ps/product-description', function (req, res) {
  if (!req.session.data['productEntries']) {
    req.session.data['productEntries'] = [];
  }

  const editIndex = req.session.data['editIndex'];

  if (typeof editIndex !== 'undefined') {
    // When editing: merge new description/commodity-code with existing entry data
    const existingEntry = req.session.data['productEntries'][editIndex];
    req.session.data['productEntries'][editIndex] = {
      ...existingEntry,
      commodityCode: req.body['commodity-code'],
      description: req.body['description'],
      isPartial: existingEntry.isPartial // preserve isPartial status
    };
  } else {
    // When adding new: create partial entry with just description and commodity code
    const newEntry = {
      commodityCode: req.body['commodity-code'],
      description: req.body['description'],
      isPartial: true // flag to indicate it's awaiting details
    };
    req.session.data['productEntries'].push(newEntry);
    // Set editIndex to the newly created entry so product-details knows to update it
    req.session.data['editIndex'] = req.session.data['productEntries'].length - 1;
  }

  req.session.data['description'] = req.body['description'];
  req.session.data['commodity-code'] = req.body['commodity-code'];

  res.redirect('/epsilon/ps/product-details');
});

// GET route for product details page
router.get('/epsilon/ps/product-details', function (req, res) {
  res.render('epsilon/ps/product-details', {
    data: req.session.data || {}
  });
  // Clear errors after displaying them so they don't persist on next visit
  delete req.session.data['formErrors'];
});

// Route for product details
router.post('/epsilon/ps/product-details', function (req, res) {
  const action = req.body.action;

  const newDetails = {
    ukDocument: req.body['uk-document'],
    issuingCountry: req.body['issuing-country'],
    species: req.body['species'],
    productReferenceNumber: req.body['productReferenceNumber'],
    'catch-certificate-code': req.body['catch-certificate-code'],
    'catch-certificate-weight': req.body['catch-certificate-weight'],
    'net-weight': req.body['net-weight'],
    'fish-weight': req.body['fish-weight'],
    isPartial: false,
    description: req.session.data['description'],
    commodityCode: req.session.data['commodity-code']
  };

  // Only validate when "Add" button is clicked, not when "Save and continue" is clicked
  if (action === 'add') {
    const errors = [];

    if (!req.body['catch-certificate-weight'] || req.body['catch-certificate-weight'] === '') {
      errors.push({
        fieldName: 'catch-certificate-weight',
        message: 'Enter the total weight landed in kg'
      });
    }

    if (!req.body['net-weight'] || req.body['net-weight'] === '') {
      errors.push({
        fieldName: 'net-weight',
        message: 'Enter the export weight in kg (before processing)'
      });
    }

    if (!req.body['fish-weight'] || req.body['fish-weight'] === '') {
      errors.push({
        fieldName: 'fish-weight',
        message: 'Enter the export weight in kg (after processing)'
      });
    }

    // Check weight logic: net-weight (before processing) should be ≤ catch-certificate-weight
    if (req.body['net-weight'] && req.body['catch-certificate-weight']) {
      if (parseFloat(req.body['net-weight']) > parseFloat(req.body['catch-certificate-weight'])) {
        errors.push({
          fieldName: 'net-weight',
          message: 'Export weight before processing must be the same or less than the total weight shown on catch certificate in kg'
        });
      }
    }

    // If there are errors, store them and re-render the form
    if (errors.length > 0) {
      req.session.data['formErrors'] = errors;
      return res.redirect('/epsilon/ps/product-details');
    }
  }

  // Clear any previous errors
  delete req.session.data['formErrors'];

  // ✅ Validate required fields before saving
  const hasRequiredFields =
    newDetails.species &&
    newDetails.productReferenceNumber &&
    newDetails['net-weight'] &&
    newDetails['fish-weight'] &&
    newDetails['catch-certificate-weight'];

  if (!req.session.data['productEntries']) {
    req.session.data['productEntries'] = [];
  }

  if (hasRequiredFields) {
    const editIndex = req.session.data['editIndex'];
    if (typeof editIndex !== 'undefined') {
      // Update existing entry and mark as complete
      newDetails.isPartial = false;
      req.session.data['productEntries'][editIndex] = newDetails;
      delete req.session.data['editIndex'];
    } else {
      // Add new entry
      newDetails.isPartial = false;
      req.session.data['productEntries'].push(newDetails);
    }
  }

  // ✅ Store species in session for pre-filling
  req.session.data['species'] = req.body['species'];

  if (action === 'add') {
    res.redirect('/epsilon/ps/product-details#species-table-container');
  } else if (action === 'continue') {
    // Clear editIndex when moving to next page
    delete req.session.data['editIndex'];
    res.redirect('/epsilon/ps/updated-product-summary');
  }
});

// Route for product summary search and pagination
router.get('/epsilon/ps/product-summary', function (req, res) {

  const searchQuery = (req.query.s || '').toLowerCase();
  const page = parseInt(req.query.page) || 1;
  const perPage = 10;

  let productEntries = req.session.data['productEntries'] || [];

// Filter
if (searchQuery) {
  productEntries = productEntries.filter(entry =>
    (entry.description ?? '').toString().toLowerCase().includes(searchQuery) ||
    (entry.species ?? '').toString().toLowerCase().includes(searchQuery) ||
    (entry.commodityCode ?? '').toString().toLowerCase().includes(searchQuery) ||
    (
      Array.isArray(entry.productReferenceNumber)
        ? entry.productReferenceNumber.some(ref =>
            ref.toLowerCase().includes(searchQuery)
          )
        : (entry.productReferenceNumber ?? '').toString().toLowerCase().includes(searchQuery)
    )
  );
}



  // Paginate
  const totalPages = Math.ceil(productEntries.length / perPage);
  const paginatedEntries = productEntries.slice((page - 1) * perPage, page * perPage);

  res.render('epsilon/ps/product-summary', {
    data: {
      productEntries: paginatedEntries,
      description: req.session.data['description']
    },
    currentPage: page,
    totalPages,
    searchQuery
  });
});

router.get('/epsilon/ps/edit-product/:index', function (req, res) {
  const index = parseInt(req.params.index);
  const product = req.session.data['productEntries'][index];

  // Pre-fill session fields with selected product
  req.session.data['uk-document'] = product.ukDocument;
  req.session.data['productReferenceNumber'] = product.productReferenceNumber;
  req.session.data['species'] = product.species;
  req.session.data['commodity-code'] = product.commodityCode;
  req.session.data['description'] = product.description;
  req.session.data['net-weight'] = product.netWeight;
  req.session.data['fish-weight'] = product.fishWeight;
  req.session.data['catch-certificate-weight'] = product['catch-certificate-weight'];

  // Store index for update later
  req.session.data['editIndex'] = index;

  res.redirect('/epsilon/ps/product-description');
});

// Route for remove product (similar to edit, but with removeMode flag)
router.get('/epsilon/ps/remove-product/:index', function (req, res) {
  const index = parseInt(req.params.index);
  const product = req.session.data['productEntries'][index];

  if (!product) {
    return res.redirect('/epsilon/ps/product-summary');
  }

  // Pre-fill session fields with selected product
  req.session.data['species'] = product.species;
  req.session.data['commodity-code'] = product.commodityCode;
  req.session.data['description'] = product.description;
  req.session.data['net-weight'] = product.netWeight;
  req.session.data['fish-weight'] = product.fishWeight;
  req.session.data['catch-certificate-weight'] = product['catch-certificate-weight'];
  req.session.data['productReferenceNumber'] = product.productReferenceNumber;

  // Set flags for removal flow
  req.session.data['removeMode'] = true;
  req.session.data['removeIndex'] = index;

  res.redirect('/epsilon/ps/product-description');
});

// Route for direct product removal from product-details (no confirmation)
router.get('/epsilon/ps/remove-product-directly/:index', function (req, res) {
  const index = parseInt(req.params.index);

  // Direct removal without confirmation
  if (req.session.data['productEntries'] && req.session.data['productEntries'][index]) {
    req.session.data['productEntries'].splice(index, 1);
  }

  // Clear product fields
  req.session.data['species'] = '';
  req.session.data['commodity-code'] = '';
  req.session.data['description'] = '';
  req.session.data['net-weight'] = '';
  req.session.data['fish-weight'] = '';
  req.session.data['catch-certificate-weight'] = '';
  req.session.data['productReferenceNumber'] = '';

  // Redirect back to product-details
  res.redirect('/epsilon/ps/product-details');
});

// Route for confirm remove product (GET)
router.get('/epsilon/ps/confirm-remove-product/:index', function (req, res) {
  const index = parseInt(req.params.index);
  const product = req.session.data['productEntries'][index];

  if (!product) {
    return res.redirect('/epsilon/ps/product-summary');
  }

  res.render('epsilon/ps/confirm-remove-product', {
    data: {
      description: product.description
    },
    productIndex: index
  });
});

// Route for confirm remove product (POST)
router.post('/epsilon/ps/confirm-remove-product/:index', function (req, res) {
  const action = req.body.action;

  if (action === 'yes') {
    // Remove ALL entries with the matching description
    const descriptionToRemove = req.session.data['description'];

    if (descriptionToRemove && req.session.data['productEntries']) {
      // Filter out all entries with matching description
      req.session.data['productEntries'] = req.session.data['productEntries'].filter(entry =>
        entry.description !== descriptionToRemove
      );
    }

    // Clear removal flags
    delete req.session.data['removeMode'];
    delete req.session.data['removeIndex'];

    // Clear product fields
    req.session.data['species'] = '';
    req.session.data['commodity-code'] = '';
    req.session.data['description'] = '';
    req.session.data['net-weight'] = '';
    req.session.data['fish-weight'] = '';
    req.session.data['catch-certificate-weight'] = '';
    req.session.data['productReferenceNumber'] = '';

    // Check if there are any products left
    const remainingProducts = (req.session.data['productEntries'] || []).filter(entry =>
      !entry.isPartial && entry.species
    );

    if (remainingProducts.length > 1) {
      // Multiple products remain - show summary
      res.redirect('/epsilon/ps/product-summary');
    } else {
      // One or no products left - go back to description to add/edit more
      res.redirect('/epsilon/ps/product-description');
    }
  } else {
    // No - clear removal flags but keep product data and go back to product-description
    delete req.session.data['removeMode'];
    delete req.session.data['removeIndex'];
    res.redirect('/epsilon/ps/product-description');
  }
});

// Route for product summary
router.post('/epsilon/ps/product-summary', function (req, res) {
  req.session.data['more-products'] = req.body['more-products'];

  const productEntries = req.body['more-products'];

  if (productEntries === 'Yes') {
    // ✅ Clear single-entry fields to prevent carry-over
    req.session.data['uk-document'] = '';
    req.session.data['productReferenceNumber'] = '';
    req.session.data['species'] = '';
    req.session.data['commodity-code'] = '';
    req.session.data['description'] = '';
    req.session.data['net-weight'] = '';
    req.session.data['fish-weight'] = '';
    req.session.data['catch-certificate-weight'] = '';

    // ✅ Clear edit index to ensure new entry is created
    delete req.session.data['editIndex'];

    // ❌ Do NOT clear productEntries — keep previous products
    // req.session.data['productEntries'] = []; ← removed

    res.redirect('/epsilon/ps/product-description'); // stays in PS flow
  } else if (productEntries === 'No') {
    res.redirect('/epsilon/ps/plant-details');
} else {
  // Render the summary page directly if no selection
  res.render('epsilon/ps/product-summary', {
    data: {
      productEntries: req.session.data['productEntries'],
      description: req.session.data['description']
    },
    currentPage: 1,
    totalPages: Math.ceil((req.session.data['productEntries'] || []).length / 10),
    searchQuery: ''
  });
}

});

// Route for updated-product-summary
router.get('/epsilon/ps/updated-product-summary', function (req, res) {
  const searchQuery = (req.query.s || '').toLowerCase();
  const page = parseInt(req.query.page) || 1;
  const perPage = 10;

  const allProductEntries = req.session.data['productEntries'] || [];

  // Filter out partial or incomplete entries
  let filteredEntries = allProductEntries.filter(entry =>
    !entry.isPartial && entry.species
  );

  // Apply search filter
  if (searchQuery) {
    filteredEntries = filteredEntries.filter(entry =>
      (entry.description ?? '').toLowerCase().includes(searchQuery) ||
      (entry.species ?? '').toLowerCase().includes(searchQuery) ||
      (entry.commodityCode ?? '').toLowerCase().includes(searchQuery) ||
      (
        Array.isArray(entry.productReferenceNumber)
          ? entry.productReferenceNumber.some(ref =>
              ref.toLowerCase().includes(searchQuery)
            )
          : (entry.productReferenceNumber ?? '').toLowerCase().includes(searchQuery)
      )
    );
  }

  // Paginate after filtering
  const totalPages = Math.ceil(filteredEntries.length / perPage);
  const paginatedEntries = filteredEntries.slice((page - 1) * perPage, page * perPage);

  res.render('epsilon/ps/updated-product-summary', {
    data: {
      productEntries: paginatedEntries,       // filtered + paginated
      allProductEntries: allProductEntries    // full list for counting
    },
    currentPage: page,
    totalPages,
    searchQuery
  });
});

//Route for updated-product-summary
router.post('/epsilon/ps/updated-product-summary', function (req, res) {
  const moreProducts = req.body['more-products'];
  req.session.data['more-products'] = moreProducts;

  if (moreProducts === 'Yes') {
    // Clear single-entry fields
    req.session.data['uk-document'] = '';
    req.session.data['productReferenceNumber'] = '';
    req.session.data['species'] = '';
    req.session.data['commodity-code'] = '';
    req.session.data['description'] = '';
    req.session.data['net-weight'] = '';
    req.session.data['fish-weight'] = '';
    req.session.data['catch-certificate-weight'] = '';
    delete req.session.data['editIndex'];

    res.redirect('/epsilon/ps/product-description');
  } else if (moreProducts === 'No') {
    res.redirect('/epsilon/ps/plant-details');
  } else {
    // No selection made — redirect to GET route
    res.redirect('/epsilon/ps/updated-product-summary');
  }
});



// Route for storage facility details
router.post('/epsilon/ps/plant-details', function (req, res) {
  req.session.data['plant-name'] = req.body['plant-name'];
  req.session.data['person-name'] = req.body['person-name'];
  req.session.data['approval-number'] = req.body['approval-number'];
  // Add more fields as needed
  res.redirect('/epsilon/ps/plant-address');
});

// Route for storage facility details
router.post('/epsilon/ps/plant-address', function (req, res) {
  req.session.data['postcode'] = req.body['postcode'];
  // Add more fields as needed
  res.redirect('/epsilon/ps/plant-address-2');
});

// Route for storage facility address
router.post('/epsilon/ps/plant-address-2', function (req, res) {
  req.session.data['building-number'] = req.body['building-number'];
  req.session.data['building-name'] = req.body['building-name'];
  req.session.data['sub-building-name'] = req.body['sub-building-name'];
  req.session.data['street-name'] = req.body['street-name'];
  req.session.data['county'] = req.body['county'];
  req.session.data['country'] = req.body['country'];
  // Add more fields as needed
  res.redirect('/epsilon/ps/plant-confirmation');
});

// Route for storage facility confirmation
router.post('/epsilon/ps/plant-confirmation', function (req, res) {
  
  // Add more fields as needed
  res.redirect('/epsilon/ps/health-certificate');

});

// Route for health certificate details
router.post('/epsilon/ps/health-certificate', function (req, res) {
  req.session.data['health-certificate'] = req.body['health-certificate'];

    // Combine arrival date
const arrivalDay = req.body['certificate-date-day'];
const arrivalMonth = req.body['certificate-date-month']; // fix typo in HTML
const arrivalYear = req.body['certificate-date-year'];
req.session.data['certificate-date'] = `${arrivalDay}/${arrivalMonth}/${arrivalYear}`;
  // Add more fields as needed
  res.redirect('/epsilon/ps/departure-destination');
});

// Route for departure destination
router.post('/epsilon/ps/departure-destination', function (req, res) {
  req.session.data['departure-destination-country'] = req.body['departure-destination-country'];
  // Add more fields as needed
  res.redirect('/epsilon/ps/progress');
});

router.post('/epsilon/ps/progress', function (req, res) {
  // Handle the progress form submission
  const action = req.body._action || req.body.formaction;

  if (action === 'progress') {
    // Redirect to the next step in the journey
    res.redirect('/epsilon/ps/check-your-answers');
  } else {
    // Redirect to the previous step or stay on the same page
    res.redirect('/epsilon/ps/progress');
  }
});


// ===== ZETA ROUTES (copied from EPSILON, Q4 iteration) =====
router.get('/zeta/transport/check-your-answers', function (req, res) {
  const data = req.session.data;
  const groupedTransportTypes = getGroupedTransportTypes(data);
  res.render('zeta/transport/check-your-answers', {
    data,
    groupedTransportTypes
  });
});


// Route for handling transport selection
router.post('/zeta/transport/transport-type', function (req, res) {
  const transportType = req.body['transport-type'];

  if (transportType === 'Truck') {
    res.redirect('/zeta/transport/transport-truck');
  } else if (transportType === 'Plane') {
    res.redirect('/zeta/transport/transport-plane');
  } else if (transportType === 'Train') {
    res.redirect('/zeta/transport/transport-train');
  } else if (transportType === 'Container vessel') {
    res.redirect('/zeta/transport/transport-container-vessel');
  } else {
    res.redirect('/zeta/transport/transport-type');  // Redirect back if no option selected

  }
});

// Route for handling landings option selection
router.post('/zeta/landings-entry', function (req, res) {
  const landingsOption = req.body['landings-option'];

  if (landingsOption === 'dl' || landingsOption === 'manual' || landingsOption === 'upload') {
    req.session.data['landingsOption'] = landingsOption;
    res.redirect('/zeta/catch/progress'); // Always go to progress, like gamma
  } else {
    res.redirect('/zeta/catch/landings-entry'); // Redirect back if no option selected
  }
});

// Route for handling landings option selection (catch subfolder version)
router.post('/zeta/catch/landings-entry', function (req, res) {
  const landingsOption = req.body['landings-option'];

  if (landingsOption === 'dl' || landingsOption === 'manual' || landingsOption === 'upload') {
    req.session.data['landingsOption'] = landingsOption;
    res.redirect('/zeta/catch/progress');
  } else {
    res.redirect('/zeta/catch/landings-entry');
  }
});




// Route for handling truck transport
router.post('/zeta/transport/transport-truck', function (req, res) {
  req.session.data['truck-nationality'] = req.body['truck-nationality'];
  req.session.data['truck-registration'] = req.body['registration-number'];
  req.session.data['export-place'] = req.body['export-place'];
  req.session.data['destination-point-truck'] = req.body['destination-point-truck'];
  req.session.data['freight-number'] = req.body['freight-number'];
  req.session.data['container-identification-truck'] = req.body['container-identification-truck']; // single value

  // Add to transportTypes array in session
  req.session.data['transportTypes'] = req.session.data['transportTypes'] || [];
  req.session.data['transportTypes'].push({
    type: 'Truck',
    truckNationality: req.body['truck-nationality'],
    truckRegistration: req.body['registration-number'],
    exportPlace: req.body['export-place'],
    destinationPoint: req.body['destination-point-truck'],
    freightBillNumber: req.body['freight-number'],
    containerIdentification: req.body['container-identification-truck']
  });
 
  res.redirect('/zeta/transport/transport-documents');
});

// Route for handling plane transport
router.post('/zeta/transport/transport-plane', function (req, res) {
  req.session.data['airway-bill'] = req.body['airway-bill'];
  req.session.data['flight-number'] = req.body['flight-number'];
  req.session.data['plane-departure'] = req.body['plane-departure'];
  req.session.data['destination-point-plane'] = req.body['destination-point-plane'];
  req.session.data['container-identification'] = req.body['container-identification'];

  req.session.data['transportTypes'] = req.session.data['transportTypes'] || [];
  req.session.data['transportTypes'].push({
    type: 'Plane',
    flightNumber: req.body['flight-number'],
    planeDeparture: req.body['plane-departure'],
    destinationPoint: req.body['destination-point-plane'],
    airwayBill: req.body['airway-bill'],
    containerIdentification: req.body['container-identification']
  });
  res.redirect('/zeta/transport/transport-documents-plane');
});

// Route for handling train transport
router.post('/zeta/transport/transport-train', function (req, res) {
  req.session.data['railway-bill'] = req.body['railway-bill'];
  req.session.data['train-departure'] = req.body['train-departure'];
  req.session.data['destination-point-train'] = req.body['destination-point-train'];
  req.session.data['freight-bill'] = req.body['freight-bill'];
  req.session.data['container-identification-train'] = req.body['container-identification-train']; // single value


  req.session.data['transportTypes'] = req.session.data['transportTypes'] || [];
  req.session.data['transportTypes'].push({
    type: 'Train',
    railwayBill: req.body['railway-bill'],
    trainDeparture: req.body['train-departure'],
    destinationPoint: req.body['destination-point-train'],
    freightBillNumber: req.body['freight-bill'],
    containerIdentification: req.body['container-identification-train']
  });
  res.redirect('/zeta/transport/transport-documents-train');
});

// Route for handling container vessel transport
router.post('/zeta/transport/transport-container-vessel', function (req, res) {
  req.session.data['vessel-name'] = req.body['vessel-name'];
  req.session.data['flag-state'] = req.body['flag-state'];
  req.session.data['container-vessel-departure'] = req.body['container-vessel-departure'];
  req.session.data['destination-point-vessel'] = req.body['destination-point-vessel'];
  req.session.data['freight-bill'] = req.body['freight-bill'];

  req.session.data['transportTypes'] = req.session.data['transportTypes'] || [];
  req.session.data['transportTypes'].push({
    type: 'Container vessel',
    vesselName: req.body['vessel-name'],
    flagState: req.body['flag-state'],
    containerVesselDeparture: req.body['container-vessel-departure'],
    destinationPoint: req.body['destination-point-vessel'],
    freightBillNumber: req.body['freight-bill']
  });
  res.redirect('/zeta/transport/transport-documents-vessel');
});


// TRUCK DOCUMENTS
router.post('/zeta/transport/transport-documents', function (req, res) {
  let documentNames = req.session.data['documentName[]'] || [];
  let referenceNumbers = req.session.data['referenceNumber[]'] || [];

  const names = req.body['documentName[]'] || req.body.documentName;
  const refs = req.body['referenceNumber[]'] || req.body.referenceNumber;
  const editIndex = req.body.editIndex;

  if (editIndex !== undefined && editIndex !== '') {
    documentNames[editIndex] = names;
    referenceNumbers[editIndex] = refs;
  } else {
    if (Array.isArray(names)) {
      documentNames.push(...names);
      referenceNumbers.push(...refs);
    } else {
      documentNames.push(names);
      referenceNumbers.push(refs);
    }
  }

  req.session.data['documentName[]'] = documentNames;
  req.session.data['referenceNumber[]'] = referenceNumbers;

  res.redirect('/zeta/transport/transport-additional');
});

// TRAIN DOCUMENTS
router.post('/zeta/transport/transport-documents-train', function (req, res) {
  let documentNames = req.session.data['trainDocumentName[]'] || [];
  let referenceNumbers = req.session.data['trainReferenceNumber[]'] || [];

  const names = req.body['documentName[]'] || req.body.documentName;
  const refs = req.body['referenceNumber[]'] || req.body.referenceNumber;
  const editIndex = req.body.editIndex;

  if (editIndex !== undefined && editIndex !== '') {
    documentNames[editIndex] = names;
    referenceNumbers[editIndex] = refs;
  } else {
    if (Array.isArray(names)) {
      documentNames.push(...names);
      referenceNumbers.push(...refs);
    } else {
      documentNames.push(names);
      referenceNumbers.push(refs);
    }
  }

  req.session.data['trainDocumentName[]'] = documentNames;
  req.session.data['trainReferenceNumber[]'] = referenceNumbers;

  res.redirect('/zeta/transport/transport-additional');
});

// PLANE DOCUMENTS
router.post('/zeta/transport/transport-documents-plane', function (req, res) {
  let documentNames = req.session.data['planeDocumentName[]'] || [];
  let referenceNumbers = req.session.data['planeReferenceNumber[]'] || [];

  const names = req.body['documentName[]'] || req.body.documentName;
  const refs = req.body['referenceNumber[]'] || req.body.referenceNumber;
  const editIndex = req.body.editIndex;

  if (editIndex !== undefined && editIndex !== '') {
    documentNames[editIndex] = names;
    referenceNumbers[editIndex] = refs;
  } else {
    if (Array.isArray(names)) {
      documentNames.push(...names);
      referenceNumbers.push(...refs);
    } else {
      documentNames.push(names);
      referenceNumbers.push(refs);
    }
  }

  req.session.data['planeDocumentName[]'] = documentNames;
  req.session.data['planeReferenceNumber[]'] = referenceNumbers;

  res.redirect('/zeta/transport/transport-additional');
});

// VESSEL DOCUMENTS
router.post('/zeta/transport/transport-documents-vessel', function (req, res) {
  let documentNames = req.session.data['vesselDocumentName[]'] || [];
  let referenceNumbers = req.session.data['vesselReferenceNumber[]'] || [];

  const names = req.body['documentName[]'] || req.body.documentName;
  const refs = req.body['referenceNumber[]'] || req.body.referenceNumber;
  const editIndex = req.body.editIndex;

  if (editIndex !== undefined && editIndex !== '') {
    documentNames[editIndex] = names;
    referenceNumbers[editIndex] = refs;
  } else {
    if (Array.isArray(names)) {
      documentNames.push(...names);
      referenceNumbers.push(...refs);
    } else {
      documentNames.push(names);
      referenceNumbers.push(refs);
    }
  }

  req.session.data['vesselDocumentName[]'] = documentNames;
  req.session.data['vesselReferenceNumber[]'] = referenceNumbers;

  res.redirect('/zeta/transport/transport-additional');
});





router.post('/zeta/transport/transport-additional', function (req, res) {
  // Handle removal of a transport row
  const removeIndex = req.body.removeIndex;
  if (removeIndex !== undefined && removeIndex !== '') {
    let transportTypes = req.session.data['transportTypes'] || [];
    // Get the type of the transport being removed
    const removed = transportTypes[removeIndex];
    const removedType = removed && removed.type;
    transportTypes.splice(removeIndex, 1);
    req.session.data['transportTypes'] = transportTypes;
    // Only remove from the relevant document/reference arrays for the removed type
    if (removedType === 'Truck') {
      let documentNames = req.session.data['documentName[]'] || [];
      let referenceNumbers = req.session.data['referenceNumber[]'] || [];
      if (documentNames.length > removeIndex) documentNames.splice(removeIndex, 1);
      if (referenceNumbers.length > removeIndex) referenceNumbers.splice(removeIndex, 1);
      req.session.data['documentName[]'] = documentNames;
      req.session.data['referenceNumber[]'] = referenceNumbers;
    } else if (removedType === 'Train') {
      let trainDocumentNames = req.session.data['trainDocumentName[]'] || [];
      let trainReferenceNumbers = req.session.data['trainReferenceNumber[]'] || [];
      if (trainDocumentNames.length > removeIndex) trainDocumentNames.splice(removeIndex, 1);
      if (trainReferenceNumbers.length > removeIndex) trainReferenceNumbers.splice(removeIndex, 1);
      req.session.data['trainDocumentName[]'] = trainDocumentNames;
      req.session.data['trainReferenceNumber[]'] = trainReferenceNumbers;
    } else if (removedType === 'Plane') {
      let planeDocumentNames = req.session.data['planeDocumentName[]'] || [];
      let planeReferenceNumbers = req.session.data['planeReferenceNumber[]'] || [];
      if (planeDocumentNames.length > removeIndex) planeDocumentNames.splice(removeIndex, 1);
      if (planeReferenceNumbers.length > removeIndex) planeReferenceNumbers.splice(removeIndex, 1);
      req.session.data['planeDocumentName[]'] = planeDocumentNames;
      req.session.data['planeReferenceNumber[]'] = planeReferenceNumbers;
    } else if (removedType === 'Container vessel') {
      let vesselDocumentNames = req.session.data['vesselDocumentName[]'] || [];
      let vesselReferenceNumbers = req.session.data['vesselReferenceNumber[]'] || [];
      if (vesselDocumentNames.length > removeIndex) vesselDocumentNames.splice(removeIndex, 1);
      if (vesselReferenceNumbers.length > removeIndex) vesselReferenceNumbers.splice(removeIndex, 1);
      req.session.data['vesselDocumentName[]'] = vesselDocumentNames;
      req.session.data['vesselReferenceNumber[]'] = vesselReferenceNumbers;
    }
    return res.redirect('/zeta/transport/transport-additional');
  }
  let documentNames = req.session.data['documentName[]'] || [];
  let referenceNumbers = req.session.data['referenceNumber[]'] || [];

  const name = req.body['documentName[]'];
  const ref = req.body['referenceNumber[]'];
  const editIndex = req.body.editIndex;

  if (editIndex !== undefined && editIndex !== '') {
    documentNames[editIndex] = name;
    referenceNumbers[editIndex] = ref;
  } else {
    if (Array.isArray(name)) {
      documentNames.push(...name);
      referenceNumbers.push(...ref);
    } else {
      documentNames.push(name);
      referenceNumbers.push(ref);
    }
  }

  // Save the updated document names and reference numbers back to the session

  req.session.data['documentName[]'] = documentNames;
  req.session.data['referenceNumber[]'] = referenceNumbers;
  req.session.data['additional-modes'] = req.body['additional-modes'];

  const additionalModes = req.body['additional-modes'];
  if (additionalModes === 'Yes') {
    res.redirect('/zeta/transport/transport-type');
  } else if (additionalModes === 'No') {
    res.redirect('/zeta/progress-complete');
  } else {
    res.redirect('/zeta/transport/transport-additional');
  }
});

// Route for handling the 'Your reference' page
router.post('/zeta/your-reference', function (req, res) {
  req.session.data['your-reference'] = req.body['your-reference'];
  // Add more fields as needed

  // Redirect based on which button was pressed
  if (req.body._action === 'progress' || req.body['formaction'] === 'progress') {
    res.redirect('/zeta/progress');
  } else {
    res.redirect('/zeta/exporter-details');
  }
});


// GET handler for your-reference
router.get('/zeta/catch/your-reference', function (req, res) {
  res.render('zeta/catch/your-reference', { data: req.session.data });
});

// POST handler for your-reference
router.post('/zeta/catch/your-reference', function (req, res) {
  req.session.data['your-reference'] = req.body['your-reference'];
  res.redirect('/zeta/catch/exporter-details');
});

// GET handler for exporter details
router.get('/zeta/catch/exporter-details', function (req, res) {
  res.render('zeta/catch/exporter-details', { data: req.session.data });
});

// Route for exporter details
router.post('/zeta/catch/exporter-details', function (req, res) {
  req.session.data['exporter-name'] = req.body['exporter-name']
  req.session.data['company-name'] = req.body['company-name']
  // Add more fields as needed
  res.redirect('/zeta/catch/add-products')
})

// Route for zeta catch proceed to landings (conditional based on landing option)
// GET handler for add-products
router.get('/zeta/catch/add-products', function (req, res) {
  res.render('zeta/catch/add-products', { data: req.session.data });
});

// Conditional redirect based on stored landing option
router.post('/zeta/catch/proceed-landing', function (req, res) {
  const landingsOption = req.session.data['landingsOption'] || 'dl';
  if (landingsOption === 'manual' || landingsOption === 'upload') {
    res.redirect('/zeta/catch/manual-entry');
  } else {
    res.redirect('/zeta/catch/direct-landing');
  }
});

// Route for zeta catch add landing
router.post('/zeta/catch/add-landing', function (req, res) {
  const landings = req.session.data['landings'] || [];
  const species = req.body['species'] || '—';
  const state = req.body['state'] || '—';
  const presentation = req.body['presentation'] || '—';

  landings.push({
    product: species + ', ' + state + ', ' + presentation,
    startDate: req.body['startDate'] || '',
    dateLanded: req.body['dateLanded'] || '',
    catchArea: req.body['faoArea'] || '',
    highSeas: req.body['highSeas'] || '',
    eez: req.body['eez'] || '',
    rfmo: req.body['rfmo'] || '',
    vessel: req.body['vessel'] || '',
    gearCategory: req.body['gear1'] || '',
    gearType: req.body['gear2'] || '',
    exportWeight: req.body['weight'] || ''
  });
  req.session.data['landings'] = landings;

  // Calculate total export weight from all landings
  const totalWeight = landings.reduce((sum, landing) => sum + (parseFloat(landing.exportWeight) || 0), 0);
  req.session.data['totalWeight'] = totalWeight.toFixed(2);

  // Calculate export weight per product
  const productWeights = {};
  landings.forEach(landing => {
    const key = landing.product;
    productWeights[key] = (productWeights[key] || 0) + (parseFloat(landing.exportWeight) || 0);
  });

  // Update products with their calculated export weights from landings
  const products = req.session.data['products'] || [];
  products.forEach(product => {
    const productKey = (product.species || '—') + ', ' + (product.state || '—') + ', ' + (product.presentation || '—');
    product.exportWeight = productWeights[productKey] ? productWeights[productKey].toFixed(2) : '0.00';
  });
  req.session.data['products'] = products;

  res.redirect('/zeta/catch/manual-entry');
});

router.post('/zeta/catch/add-products', function (req, res) {
  const products = req.session.data['products'] ?? [];
  const {
    species,
    state,
    presentation,
    'commodity-code': commodityCode
  } = req.body;
  products.push({
    species,
    state,
    presentation,
    commodityCode
  });
  req.session.data['products'] = products;
  res.redirect('/zeta/catch/add-products');
})

// Redirect to the next step or back to add-products page
router.post('/zeta/catch/delete-product/:index', function (req, res) {
  const products = req.session.data['products'] ?? [];
  products.splice(parseInt(req.params.index) - 1, 1);
  req.session.data['products'] = products;
  res.redirect('/zeta/catch/add-products');

})

// GET handlers for catch pages
router.get('/zeta/catch/your-reference', function (req, res) {
  res.render('zeta/catch/your-reference', { data: req.session.data });
});

router.get('/zeta/catch/landings-entry', function (req, res) {
  res.render('zeta/catch/landings-entry', { data: req.session.data });
});

router.get('/zeta/catch/catch-waters', function (req, res) {
  res.render('zeta/catch/catch-waters', { data: req.session.data });
});

router.get('/zeta/catch/export-journey', function (req, res) {
  res.render('zeta/catch/export-journey', { data: req.session.data });
});

router.get('/zeta/catch/progress', function (req, res) {
  res.render('zeta/catch/progress', { data: req.session.data });
});

router.get('/zeta/catch/direct-landing', function (req, res) {
  res.render('zeta/catch/direct-landing', { data: req.session.data });
});

router.get('/zeta/catch/manual-entry', function (req, res) {
  res.render('zeta/catch/manual-entry', { data: req.session.data });
});

router.get('/zeta/catch/catch-certificate-complete-processing', function (req, res) {
  res.render('zeta/catch/catch-certificate-complete-processing', { data: req.session.data });
});

router.post('/zeta/catch/catch-certificate-complete-processing', function (req, res) {
  res.redirect('/zeta/catch/progress');
});

router.get('/zeta/catch/upload-file', function (req, res) {
  res.render('zeta/catch/upload-file', { data: req.session.data });
});

router.get('/zeta/catch/product-favourites', function (req, res) {
  res.render('zeta/catch/product-favourites', { data: req.session.data });
});

// GET handlers for transport pages
router.get('/zeta/catch/transport/transport-type', function (req, res) {
  res.render('zeta/catch/transport/transport-type', { data: req.session.data });
});

router.get('/zeta/catch/transport/transport-additional', function (req, res) {
  const data = req.session.data;
  res.render('zeta/catch/transport/transport-additional', { data, groupedTransportTypes: getGroupedTransportTypes(data) });
});

router.get('/zeta/catch/transport/transport-truck', function (req, res) {
  res.render('zeta/catch/transport/transport-truck', { data: req.session.data });
});

router.get('/zeta/catch/transport/transport-train', function (req, res) {
  res.render('zeta/catch/transport/transport-train', { data: req.session.data });
});

router.get('/zeta/catch/transport/transport-plane', function (req, res) {
  res.render('zeta/catch/transport/transport-plane', { data: req.session.data });
});

router.get('/zeta/catch/transport/transport-container-vessel', function (req, res) {
  res.render('zeta/catch/transport/transport-container-vessel', { data: req.session.data });
});

router.get('/zeta/catch/transport/transport-documents', function (req, res) {
  res.render('zeta/catch/transport/transport-documents', { data: req.session.data });
});

router.get('/zeta/catch/transport/transport-documents-plane', function (req, res) {
  res.render('zeta/catch/transport/transport-documents-plane', { data: req.session.data });
});

router.get('/zeta/catch/transport/transport-documents-train', function (req, res) {
  res.render('zeta/catch/transport/transport-documents-train', { data: req.session.data });
});

router.get('/zeta/catch/transport/transport-documents-vessel', function (req, res) {
  res.render('zeta/catch/transport/transport-documents-vessel', { data: req.session.data });
});


// Route for adding a product favourite
router.post('/zeta/product-favourites', function (req, res) {
  const favourites = req.session.data['favourites'] ?? [];
  const {
    species,
    state,
    presentation,
    'commodity-code': commodityCode
  } = req.body;

  favourites.push({
    species,
    state,
    presentation,
    commodityCode
  });

  req.session.data['favourites'] = favourites;
  res.redirect('/zeta/product-favourites');
});

// Route for deleting a product favourite by index
router.post('/zeta/delete-favourite/:index', function (req, res) {
  const favourites = req.session.data['favourites'] ?? [];
  favourites.splice(parseInt(req.params.index), 1);
  req.session.data['favourites'] = favourites;
  res.redirect('/zeta/product-favourites');
});

// Route for rendering the product favourites page
router.get('/zeta/product-favourites', function (req, res) {
  res.render('zeta/product-favourites', { data: req.session.data });
});


// Route for displaying the add-landings page
router.get('/zeta/direct-landing', function (req, res) {
  res.render('zeta/catch/direct-landing', { data: req.session.data });
});

// Route for landing details
router.post('../zeta/direct-landing', function (req, res) {
  const session = req.session.data;

  // Save form fields to session
  session['startDateDay'] = req.body['startDateDay'];
  session['startDateMonth'] = req.body['startDateMonth'];
  session['startDateYear'] = req.body['startDateYear'];

  session['day'] = req.body['dateLandedDay'];
  session['month'] = req.body['dateLandedMonth'];
  session['year'] = req.body['dateLandedYear'];

  session['faoArea'] = req.body['faoArea'];
  session['highSeas'] = req.body['highSeas'];
  session['eez'] = req.body['eez'];
  session['rfmo'] = req.body['rfmo'];
  session['vessel'] = req.body['vessel'];
  session['gear1'] = req.body['gear1'];
  session['gear2'] = req.body['gear2'];
  session['processed-uk'] = req.body['processed-uk'];

 // Save weights array
session['weights'] = req.body['weights'];

// Calculate total export weight
let totalWeight = 0;
const weights = req.body['weights'];

if (weights) {
  for (const item of Object.values(weights)) {
    const weight = parseFloat(item.exportWeight);
    if (!isNaN(weight)) {
      totalWeight += weight;
    }
  }
}

session['totalWeight'] = totalWeight.toFixed(2);

// Check if processing confirmation is needed
if (req.body['processed-uk'] === 'yes') {
  res.redirect('/zeta/catch/catch-certificate-complete-processing');
} else {
  res.redirect('../zeta/catch-waters');
}

});


// Route for landing details
router.post('../zeta/manual-entry', function (req, res) {
  const session = req.session.data;

  // Save form fields to session
  session['startDateDay'] = req.body['startDateDay'];
  session['startDateMonth'] = req.body['startDateMonth'];
  session['startDateYear'] = req.body['startDateYear'];

  session['day'] = req.body['dateLandedDay'];
  session['month'] = req.body['dateLandedMonth'];
  session['year'] = req.body['dateLandedYear'];

  session['faoArea'] = req.body['faoArea'];
  session['highSeas'] = req.body['highSeas'];
  session['eez'] = req.body['eez'];
  session['rfmo'] = req.body['rfmo'];
  session['vessel'] = req.body['vessel'];
  session['gear1'] = req.body['gear1'];
  session['gear2'] = req.body['gear2'];
  session['processed-uk'] = req.body['processed-uk'];

  session['weights'] = req.body['weights']; // This is an array of objects

  // Calculate total weight
  let totalWeight = 0;
  const weights = req.body['weights'];

  if (weights) {
    for (const item of Object.values(weights)) {
      const weight = parseFloat(item.exportWeight);
      if (!isNaN(weight)) {
        totalWeight += weight;
      }
    }
  }

  session['totalWeight'] = totalWeight.toFixed(2);

  // Track landings
  if (!session.landings) {
    session.landings = [];
  }

  // Add new landing to the array
  session.landings.push({
    startDateDay: req.body['startDateDay'],
    startDateMonth: req.body['startDateMonth'],
    startDateYear: req.body['startDateYear'],
    dateLandedDay: req.body['dateLandedDay'],
    dateLandedMonth: req.body['dateLandedMonth'],
    dateLandedYear: req.body['dateLandedYear'],
    faoArea: req.body['faoArea'],
    vessel: req.body['vessel'],
    gear1: req.body['gear1'],
    gear2: req.body['gear2'],
    weights: req.body['weights']
  });

  // Save landing count
  session['landingCount'] = session.landings.length;

  // Check if processing confirmation is needed
  if (req.body['processed-uk'] === 'yes') {
    res.redirect('/zeta/catch/processing-confirmation');
  } else {
    // Redirect to the next step
    res.redirect('../zeta/catch-waters');
  }
});



// Route for export journey


router.post('../zeta/catch-waters', function (req, res) {
  req.session.data['waters'] = req.body['waters']; // This will be an array if multiple checkboxes are selected
  res.redirect('../zeta/export-journey');
});

// Proper absolute path route for zeta catch-waters
router.post('/zeta/catch/catch-waters', function (req, res) {
  req.session.data['waters'] = req.body['waters'];
  res.redirect('/zeta/catch/export-journey');
});

// Landings forms (manual and direct) continue to the catch waters question
router.post('/zeta/catch/save-landings', function (req, res) {
  const data = req.session.data;
  const landings = data['landings'] || [];
  // Auto-store has just overwritten these with the (now empty) form, so restore the last added landing
  if (landings.length) {
    const last = landings[landings.length - 1];
    data['startDate'] = last.startDate;
    data['dateLanded'] = last.dateLanded;
    data['faoArea'] = last.catchArea;
    data['highSeas'] = last.highSeas;
    data['eez'] = last.eez;
    data['rfmo'] = last.rfmo;
    data['vessel'] = last.vessel;
    data['gear1'] = last.gearCategory;
    data['gear2'] = last.gearType;
    data['weight'] = last.exportWeight;
  }
  res.redirect('/zeta/catch/catch-waters');
});

router.post('../zeta/progress', function (req, res) {
  req.session.data['waters'] = req.body['waters'];
  res.redirect('../zeta/progress');
});

router.post('../zeta/export-journey', function (req, res) {
  req.session.data['waters'] = req.body['waters'];
  res.redirect('../zeta/export-journey');
});

// Route for zeta catch transport-type
router.post('/zeta/catch/transport/transport-type', function (req, res) {
  // Countries come from export-journey; transport-type itself has no country fields
  if (req.body['departure-country']) req.session.data['departure-country'] = req.body['departure-country'];
  if (req.body['destination-country']) req.session.data['destination-country'] = req.body['destination-country'];
  const transportType = req.body['transport-type'];

  if (transportType === 'Truck') {
    res.redirect('/zeta/catch/transport/transport-truck');
  } else if (transportType === 'Plane') {
    res.redirect('/zeta/catch/transport/transport-plane');
  } else if (transportType === 'Train') {
    res.redirect('/zeta/catch/transport/transport-train');
  } else if (transportType === 'Container vessel') {
    res.redirect('/zeta/catch/transport/transport-container-vessel');
  } else {
    res.redirect('/zeta/catch/transport/transport-type');
  }
});

// POST routes for zeta catch transport pages
router.post('/zeta/catch/transport/transport-truck', function (req, res) {
  req.session.data['truck-nationality'] = req.body['truck-nationality'];
  req.session.data['truck-registration'] = req.body['registration-number'];
  req.session.data['export-place'] = req.body['export-place'];
  req.session.data['destination-point-truck'] = req.body['destination-point-truck'];
  req.session.data['freight-number'] = req.body['freight-number'];
  req.session.data['container-identification-truck'] = req.body['container-identification-truck'];
  req.session.data['transportTypes'] = req.session.data['transportTypes'] || [];
  req.session.data['transportTypes'].push({
    type: 'Truck',
    truckNationality: req.body['truck-nationality'],
    truckRegistration: req.body['registration-number'],
    exportPlace: req.body['export-place'],
    destinationPoint: req.body['destination-point-truck'],
    freightBillNumber: req.body['freight-number'],
    containerIdentification: req.body['container-identification-truck']
  });
  res.redirect('/zeta/catch/transport/transport-documents');
});

router.post('/zeta/catch/transport/transport-plane', function (req, res) {
  req.session.data['airway-bill'] = req.body['airway-bill'];
  req.session.data['flight-number'] = req.body['flight-number'];
  req.session.data['plane-departure'] = req.body['plane-departure'];
  req.session.data['destination-point-plane'] = req.body['destination-point-plane'];
  req.session.data['container-identification'] = req.body['container-identification'];
  req.session.data['transportTypes'] = req.session.data['transportTypes'] || [];
  req.session.data['transportTypes'].push({
    type: 'Plane',
    flightNumber: req.body['flight-number'],
    planeDeparture: req.body['plane-departure'],
    destinationPoint: req.body['destination-point-plane'],
    airwayBill: req.body['airway-bill'],
    containerIdentification: req.body['container-identification']
  });
  res.redirect('/zeta/catch/transport/transport-documents-plane');
});

router.post('/zeta/catch/transport/transport-train', function (req, res) {
  req.session.data['railway-bill'] = req.body['railway-bill'];
  req.session.data['train-departure'] = req.body['train-departure'];
  req.session.data['destination-point-train'] = req.body['destination-point-train'];
  req.session.data['freight-bill'] = req.body['freight-bill'];
  req.session.data['container-identification-train'] = req.body['container-identification-train'];
  req.session.data['transportTypes'] = req.session.data['transportTypes'] || [];
  req.session.data['transportTypes'].push({
    type: 'Train',
    railwayBill: req.body['railway-bill'],
    trainDeparture: req.body['train-departure'],
    destinationPoint: req.body['destination-point-train'],
    freightBillNumber: req.body['freight-bill'],
    containerIdentification: req.body['container-identification-train']
  });
  res.redirect('/zeta/catch/transport/transport-documents-train');
});

router.post('/zeta/catch/transport/transport-container-vessel', function (req, res) {
  req.session.data['vessel-name'] = req.body['vessel-name'];
  req.session.data['flag-state'] = req.body['flag-state'];
  req.session.data['container-vessel-departure'] = req.body['container-vessel-departure'];
  req.session.data['destination-point-vessel'] = req.body['destination-point-vessel'];
  req.session.data['freight-bill'] = req.body['freight-bill'];
  req.session.data['transportTypes'] = req.session.data['transportTypes'] || [];
  req.session.data['transportTypes'].push({
    type: 'Container vessel',
    vesselName: req.body['vessel-name'],
    flagState: req.body['flag-state'],
    containerVesselDeparture: req.body['container-vessel-departure'],
    destinationPoint: req.body['destination-point-vessel'],
    freightBillNumber: req.body['freight-bill']
  });
  res.redirect('/zeta/catch/transport/transport-documents-vessel');
});

router.post('/zeta/catch/transport/transport-documents', function (req, res) {
  let documentNames = req.session.data['documentName[]'] || [];
  let referenceNumbers = req.session.data['referenceNumber[]'] || [];
  const names = req.body['documentName[]'] || req.body.documentName;
  const refs = req.body['referenceNumber[]'] || req.body.referenceNumber;
  const editIndex = req.body.editIndex;
  if (editIndex !== undefined && editIndex !== '') {
    documentNames[editIndex] = names;
    referenceNumbers[editIndex] = refs;
  } else {
    if (Array.isArray(names)) { documentNames.push(...names); referenceNumbers.push(...refs); }
    else { documentNames.push(names); referenceNumbers.push(refs); }
  }
  req.session.data['documentName[]'] = documentNames;
  req.session.data['referenceNumber[]'] = referenceNumbers;
  res.redirect('/zeta/catch/transport/transport-additional');
});

router.post('/zeta/catch/transport/transport-documents-plane', function (req, res) {
  let documentNames = req.session.data['planeDocumentName[]'] || [];
  let referenceNumbers = req.session.data['planeReferenceNumber[]'] || [];
  const names = req.body['documentName[]'] || req.body.documentName;
  const refs = req.body['referenceNumber[]'] || req.body.referenceNumber;
  const editIndex = req.body.editIndex;
  if (editIndex !== undefined && editIndex !== '') {
    documentNames[editIndex] = names;
    referenceNumbers[editIndex] = refs;
  } else {
    if (Array.isArray(names)) { documentNames.push(...names); referenceNumbers.push(...refs); }
    else { documentNames.push(names); referenceNumbers.push(refs); }
  }
  req.session.data['planeDocumentName[]'] = documentNames;
  req.session.data['planeReferenceNumber[]'] = referenceNumbers;
  res.redirect('/zeta/catch/transport/transport-additional');
});

router.post('/zeta/catch/transport/transport-documents-train', function (req, res) {
  let documentNames = req.session.data['trainDocumentName[]'] || [];
  let referenceNumbers = req.session.data['trainReferenceNumber[]'] || [];
  const names = req.body['documentName[]'] || req.body.documentName;
  const refs = req.body['referenceNumber[]'] || req.body.referenceNumber;
  const editIndex = req.body.editIndex;
  if (editIndex !== undefined && editIndex !== '') {
    documentNames[editIndex] = names;
    referenceNumbers[editIndex] = refs;
  } else {
    if (Array.isArray(names)) { documentNames.push(...names); referenceNumbers.push(...refs); }
    else { documentNames.push(names); referenceNumbers.push(refs); }
  }
  req.session.data['trainDocumentName[]'] = documentNames;
  req.session.data['trainReferenceNumber[]'] = referenceNumbers;
  res.redirect('/zeta/catch/transport/transport-additional');
});

router.post('/zeta/catch/transport/transport-documents-vessel', function (req, res) {
  let documentNames = req.session.data['vesselDocumentName[]'] || [];
  let referenceNumbers = req.session.data['vesselReferenceNumber[]'] || [];
  const names = req.body['documentName[]'] || req.body.documentName;
  const refs = req.body['referenceNumber[]'] || req.body.referenceNumber;
  const editIndex = req.body.editIndex;
  if (editIndex !== undefined && editIndex !== '') {
    documentNames[editIndex] = names;
    referenceNumbers[editIndex] = refs;
  } else {
    if (Array.isArray(names)) { documentNames.push(...names); referenceNumbers.push(...refs); }
    else { documentNames.push(names); referenceNumbers.push(refs); }
  }
  req.session.data['vesselDocumentName[]'] = documentNames;
  req.session.data['vesselReferenceNumber[]'] = referenceNumbers;
  res.redirect('/zeta/catch/transport/transport-additional');
});

router.post('/zeta/catch/transport/transport-additional', function (req, res) {
  const removeIndex = req.body.removeIndex;
  if (removeIndex !== undefined && removeIndex !== '') {
    let transportTypes = req.session.data['transportTypes'] || [];
    const removed = transportTypes[removeIndex];
    const removedType = removed && removed.type;
    transportTypes.splice(removeIndex, 1);
    req.session.data['transportTypes'] = transportTypes;
    if (removedType === 'Truck') {
      let dn = req.session.data['documentName[]'] || [];
      let rn = req.session.data['referenceNumber[]'] || [];
      if (dn.length > removeIndex) dn.splice(removeIndex, 1);
      if (rn.length > removeIndex) rn.splice(removeIndex, 1);
      req.session.data['documentName[]'] = dn;
      req.session.data['referenceNumber[]'] = rn;
    } else if (removedType === 'Train') {
      let dn = req.session.data['trainDocumentName[]'] || [];
      let rn = req.session.data['trainReferenceNumber[]'] || [];
      if (dn.length > removeIndex) dn.splice(removeIndex, 1);
      if (rn.length > removeIndex) rn.splice(removeIndex, 1);
      req.session.data['trainDocumentName[]'] = dn;
      req.session.data['trainReferenceNumber[]'] = rn;
    } else if (removedType === 'Plane') {
      let dn = req.session.data['planeDocumentName[]'] || [];
      let rn = req.session.data['planeReferenceNumber[]'] || [];
      if (dn.length > removeIndex) dn.splice(removeIndex, 1);
      if (rn.length > removeIndex) rn.splice(removeIndex, 1);
      req.session.data['planeDocumentName[]'] = dn;
      req.session.data['planeReferenceNumber[]'] = rn;
    } else if (removedType === 'Container vessel') {
      let dn = req.session.data['vesselDocumentName[]'] || [];
      let rn = req.session.data['vesselReferenceNumber[]'] || [];
      if (dn.length > removeIndex) dn.splice(removeIndex, 1);
      if (rn.length > removeIndex) rn.splice(removeIndex, 1);
      req.session.data['vesselDocumentName[]'] = dn;
      req.session.data['vesselReferenceNumber[]'] = rn;
    }
    return res.redirect('/zeta/catch/transport/transport-additional');
  }
  let documentNames = req.session.data['documentName[]'] || [];
  let referenceNumbers = req.session.data['referenceNumber[]'] || [];
  const name = req.body['documentName[]'];
  const ref = req.body['referenceNumber[]'];
  const editIndex = req.body.editIndex;
  if (editIndex !== undefined && editIndex !== '') {
    documentNames[editIndex] = name;
    referenceNumbers[editIndex] = ref;
  } else {
    if (Array.isArray(name)) { documentNames.push(...name); referenceNumbers.push(...ref); }
    else { documentNames.push(name); referenceNumbers.push(ref); }
  }
  req.session.data['documentName[]'] = documentNames;
  req.session.data['referenceNumber[]'] = referenceNumbers;
  req.session.data['additional-modes'] = req.body['additional-modes'];
  const additionalModes = req.body['additional-modes'];
  if (additionalModes === 'Yes') {
    res.redirect('/zeta/catch/transport/transport-type');
  } else if (additionalModes === 'No') {
    res.redirect('/zeta/catch/transport/check-your-answers');
  } else {
    res.redirect('/zeta/catch/transport/transport-additional');
  }
});

router.get(['/zeta/catch/transport/check-your-answers', '/zeta/catch/transport/check-your-answers.html'], function (req, res) {
  const data = req.session.data;
  res.render('zeta/catch/transport/check-your-answers', { data, groupedTransportTypes: getGroupedTransportTypes(data) });
});

// Route for zeta catch progress from export-journey
router.post('/zeta/catch/progress', function (req, res) {
  if (req.body['departure-country']) req.session.data['departure-country'] = req.body['departure-country'];
  if (req.body['destination-country']) req.session.data['destination-country'] = req.body['destination-country'];
  res.redirect('/zeta/catch/progress');
});

// Route for plane transport

router.post('../zeta/progress', function (req, res) {
  req.session.data['departure-country'] = req.body['departure-country'];
  req.session.data['destination-country'] = req.body['destination-country'];
  res.redirect('../zeta/progress');
});

router.post('../zeta/transport/transport-type', function (req, res) {
  req.session.data['departure-country'] = req.body['departure-country'];
  req.session.data['destination-country'] = req.body['destination-country'];
  res.redirect('../zeta/transport/transport-type');
});

router.post('../zeta/progress', function (req, res) {
  req.session.data['airway-bill'] = req.body['airway-bill'];
  req.session.data['flight-number'] = req.body['flight-number'];
  req.session.data['plane-departure'] = req.body['plane-departure'];
  req.session.data['container-identification'] = req.body['container-identification']; // single value
  req.session.data['freight-bill'] = req.body['freight-bill'];
  res.redirect('../zeta/progress');
});

router.post('../zeta/transport/transport-documents-plane', function (req, res) {
  req.session.data['airway-bill'] = req.body['airway-bill'];
  req.session.data['flight-number'] = req.body['flight-number'];
  req.session.data['plane-departure'] = req.body['plane-departure'];
  req.session.data['container-identification'] = req.body['container-identification']; // single value
  req.session.data['freight-bill'] = req.body['freight-bill'];
  res.redirect('../zeta/transport/transport-documents-plane');
});

router.post('../zeta/transport/check-your-answers', function (req, res) {
  // You could log, save, or simulate submission here
  console.log('Final submission:', req.session.data);

  // Redirect to a confirmation page
  res.redirect('../zeta/catch-certificate-complete');
});

// Real end-of-journey submission route (matches the path the browser actually requests)
// Shows the check-your-answers review page, same as the existing flow, before final submission
router.post('/zeta/transport/check-your-answers', function (req, res) {
  res.redirect('/zeta/catch/transport/check-your-answers');
});

router.get('../gamma/catch-certificate-complete', function (req, res) {
  res.render('../gamma/catch-certificate-complete');
});

// Add your routes here
// Route for displaying the 'Check your answers' page
router.get('/poc/transport/check-your-answers', function (req, res) {
  const data = req.session.data;
  const groupedTransportTypes = getGroupedTransportTypes(data);
  res.render('poc/transport/check-your-answers', {
    data,
    groupedTransportTypes
  });
});


// Route for handling transport selection
router.post('/poc/transport/transport-type', function (req, res) {
  const transportType = req.body['transport-type'];

  if (transportType === 'Truck') {
    res.redirect('/poc/transport/transport-truck');
  } else if (transportType === 'Plane') {
    res.redirect('/poc/transport/transport-plane');
  } else if (transportType === 'Train') {
    res.redirect('/poc/transport/transport-train');
  } else if (transportType === 'Container vessel') {
    res.redirect('/poc/transport/transport-container-vessel');
  } else {
    res.redirect('/poc/transport/transport-type');  // Redirect back if no option selected

  }
});


// Route for handling truck transport
router.post('/poc/transport/transport-truck', function (req, res) {
  req.session.data['truck-nationality'] = req.body['truck-nationality'];
  req.session.data['truck-registration'] = req.body['registration-number'];
  req.session.data['export-place'] = req.body['export-place'];
  req.session.data['freight-number'] = req.body['freight-number'];

  // Add to transportTypes array in session
  req.session.data['transportTypes'] = req.session.data['transportTypes'] || [];
  req.session.data['transportTypes'].push({
    type: 'Truck',
    truckNationality: req.body['truck-nationality'],
    truckRegistration: req.body['registration-number'],
    exportPlace: req.body['export-place'],
    freightBillNumber: req.body['freight-number']
  });
  res.redirect('/poc/transport/transport-documents');
});

// Route for handling plane transport
router.post('/poc/transport/transport-plane', function (req, res) {
  req.session.data['airway-bill'] = req.body['airway-bill'];
  req.session.data['flight-number'] = req.body['flight-number'];
  req.session.data['plane-departure'] = req.body['plane-departure'];
  req.session.data['container-identification'] = req.body['container-identification'];

  req.session.data['transportTypes'] = req.session.data['transportTypes'] || [];
  req.session.data['transportTypes'].push({
    type: 'Plane',
    flightNumber: req.body['flight-number'],
    planeDeparture: req.body['plane-departure'],
    airwayBill: req.body['airway-bill'],
    containerIdentification: req.body['container-identification']
  });
  res.redirect('/poc/transport/transport-documents-plane');
});

// Route for handling train transport
router.post('/poc/transport/transport-train', function (req, res) {
  req.session.data['railway-bill'] = req.body['railway-bill'];
  req.session.data['train-departure'] = req.body['train-departure'];
  req.session.data['freight-bill'] = req.body['freight-bill'];

  req.session.data['transportTypes'] = req.session.data['transportTypes'] || [];
  req.session.data['transportTypes'].push({
    type: 'Train',
    railwayBill: req.body['railway-bill'],
    trainDeparture: req.body['train-departure'],
    freightBillNumber: req.body['freight-bill']
  });
  res.redirect('/poc/transport/transport-documents-train');
});

// Route for handling container vessel transport
router.post('/poc/transport/transport-container-vessel', function (req, res) {
  req.session.data['vessel-name'] = req.body['vessel-name'];
  req.session.data['flag-state'] = req.body['flag-state'];
  req.session.data['container-vessel-departure'] = req.body['container-vessel-departure'];
  req.session.data['freight-bill'] = req.body['freight-bill'];

  req.session.data['transportTypes'] = req.session.data['transportTypes'] || [];
  req.session.data['transportTypes'].push({
    type: 'Container vessel',
    vesselName: req.body['vessel-name'],
    flagState: req.body['flag-state'],
    containerVesselDeparture: req.body['container-vessel-departure'],
    freightBillNumber: req.body['freight-bill']
  });
  res.redirect('/poc/transport/transport-documents-vessel');
});


router.get('/poc/transport/transport-documents', function (req, res) {
  const editIndex = req.query.edit;
  const removeIndex = req.query.remove;

  let documentNames = req.session.data['documentName[]'] || [];
  let referenceNumbers = req.session.data['referenceNumber[]'] || [];

  // Handle removal
  if (removeIndex !== undefined) {
    documentNames.splice(removeIndex, 1);
    referenceNumbers.splice(removeIndex, 1);
    req.session.data['documentName[]'] = documentNames;
    req.session.data['referenceNumber[]'] = referenceNumbers;
    return res.redirect('/poc/transport/transport-additional');
  }

  // Handle editing
  if (editIndex !== undefined) {
    res.render('poc/transport/transport-documents', {
      data: req.session.data,
      editIndex: editIndex,
      editDocumentName: documentNames[editIndex],
      editReferenceNumber: referenceNumbers[editIndex]
    });
  } else {
    res.render('poc/transport/transport-documents', {
      data: req.session.data
    });
  }
});



router.post('/poc/transport/transport-additional', function (req, res) {
  // Handle removal of a transport row
  const removeIndex = req.body.removeIndex;
  if (removeIndex !== undefined && removeIndex !== '') {
    let transportTypes = req.session.data['transportTypes'] || [];
    // Get the type of the transport being removed
    const removed = transportTypes[removeIndex];
    const removedType = removed && removed.type;
    transportTypes.splice(removeIndex, 1);
    req.session.data['transportTypes'] = transportTypes;
    // Only remove from the relevant document/reference arrays for the removed type
    if (removedType === 'Truck') {
      let documentNames = req.session.data['documentName[]'] || [];
      let referenceNumbers = req.session.data['referenceNumber[]'] || [];
      if (documentNames.length > removeIndex) documentNames.splice(removeIndex, 1);
      if (referenceNumbers.length > removeIndex) referenceNumbers.splice(removeIndex, 1);
      req.session.data['documentName[]'] = documentNames;
      req.session.data['referenceNumber[]'] = referenceNumbers;
    } else if (removedType === 'Train') {
      let trainDocumentNames = req.session.data['trainDocumentName[]'] || [];
      let trainReferenceNumbers = req.session.data['trainReferenceNumber[]'] || [];
      if (trainDocumentNames.length > removeIndex) trainDocumentNames.splice(removeIndex, 1);
      if (trainReferenceNumbers.length > removeIndex) trainReferenceNumbers.splice(removeIndex, 1);
      req.session.data['trainDocumentName[]'] = trainDocumentNames;
      req.session.data['trainReferenceNumber[]'] = trainReferenceNumbers;
    } else if (removedType === 'Plane') {
      let planeDocumentNames = req.session.data['planeDocumentName[]'] || [];
      let planeReferenceNumbers = req.session.data['planeReferenceNumber[]'] || [];
      if (planeDocumentNames.length > removeIndex) planeDocumentNames.splice(removeIndex, 1);
      if (planeReferenceNumbers.length > removeIndex) planeReferenceNumbers.splice(removeIndex, 1);
      req.session.data['planeDocumentName[]'] = planeDocumentNames;
      req.session.data['planeReferenceNumber[]'] = planeReferenceNumbers;
    } else if (removedType === 'Container vessel') {
      let vesselDocumentNames = req.session.data['vesselDocumentName[]'] || [];
      let vesselReferenceNumbers = req.session.data['vesselReferenceNumber[]'] || [];
      if (vesselDocumentNames.length > removeIndex) vesselDocumentNames.splice(removeIndex, 1);
      if (vesselReferenceNumbers.length > removeIndex) vesselReferenceNumbers.splice(removeIndex, 1);
      req.session.data['vesselDocumentName[]'] = vesselDocumentNames;
      req.session.data['vesselReferenceNumber[]'] = vesselReferenceNumbers;
    }
    return res.redirect('/poc/transport/transport-additional');
  }
  let documentNames = req.session.data['documentName[]'] || [];
  let referenceNumbers = req.session.data['referenceNumber[]'] || [];

  const name = req.body['documentName[]'];
  const ref = req.body['referenceNumber[]'];
  const editIndex = req.body.editIndex;

  if (editIndex !== undefined && editIndex !== '') {
    documentNames[editIndex] = name;
    referenceNumbers[editIndex] = ref;
  } else {
    if (Array.isArray(name)) {
      documentNames.push(...name);
      referenceNumbers.push(...ref);
    } else {
      documentNames.push(name);
      referenceNumbers.push(ref);
    }
  }

  req.session.data['documentName[]'] = documentNames;
  req.session.data['referenceNumber[]'] = referenceNumbers;
  req.session.data['additional-modes'] = req.body['additional-modes'];

  const additionalModes = req.body['additional-modes'];
  if (additionalModes === 'Yes') {
    res.redirect('/poc/transport/transport-type');
  } else if (additionalModes === 'No') {
    res.redirect('/poc/progress-complete');
  } else {
    res.redirect('/poc/transport/transport-additional');
  }
});




// Route for exporter details
router.post('../poc/add-products', function (req, res) {
  req.session.data['exporter-name'] = req.body['exporter-name']
  req.session.data['company-name'] = req.body['exporter-name']
  // Add more fields as needed
  res.redirect('../poc/add-products')
})



// Route for landing details
router.post('../poc/add-landings', function (req, res) {
  const session = req.session.data;

  // Save form fields to session
  session['startDateDay'] = req.body['startDateDay'];
  session['startDateMonth'] = req.body['startDateMonth'];
  session['startDateYear'] = req.body['startDateYear'];

  session['day'] = req.body['dateLandedDay'];
  session['month'] = req.body['dateLandedMonth'];
  session['year'] = req.body['dateLandedYear'];

  session['faoArea'] = req.body['faoArea'];
  session['highSeas'] = req.body['highSeas'];
  session['eez'] = req.body['eez'];
  session['rfmo'] = req.body['rfmo'];
  session['vessel'] = req.body['vessel'];
  session['weight'] = req.body['weight'];
  session['gear1'] = req.body['gear1'];
  session['gear2'] = req.body['gear2'];

  // Redirect to the next step
  res.redirect('../poc/catch-waters');
});


// Route for export journey


router.post('../poc/catch-waters', function (req, res) {
  req.session.data['waters'] = req.body['waters']; // This will be an array if multiple checkboxes are selected
  res.redirect('../poc/export-journey');
});

router.post('../poc/progress', function (req, res) {
  req.session.data['waters'] = req.body['waters'];
  res.redirect('../poc/progress');
});

router.post('../poc/export-journey', function (req, res) {
  req.session.data['waters'] = req.body['waters'];
  res.redirect('../poc/export-journey');
});

// Route for plane transport

router.post('../poc/progress', function (req, res) {
  req.session.data['departure-country'] = req.body['departure-country'];
  req.session.data['destination-country'] = req.body['destination-country'];
  res.redirect('../poc/progress');
});

router.post('../poc/transport/transport-type', function (req, res) {
  req.session.data['departure-country'] = req.body['departure-country'];
  req.session.data['destination-country'] = req.body['destination-country'];
  res.redirect('../poc/transport/transport-type');
});

router.post('../poc/progress', function (req, res) {
  req.session.data['airway-bill'] = req.body['airway-bill'];
  req.session.data['flight-number'] = req.body['flight-number'];
  req.session.data['plane-departure'] = req.body['plane-departure'];
  req.session.data['container-identification'] = req.body['container-identification']; // single value
  req.session.data['freight-bill'] = req.body['freight-bill'];
  res.redirect('../poc/progress');
});

router.post('../poc/transport/transport-documents-plane', function (req, res) {
  req.session.data['airway-bill'] = req.body['airway-bill'];
  req.session.data['flight-number'] = req.body['flight-number'];
  req.session.data['plane-departure'] = req.body['plane-departure'];
  req.session.data['container-identification'] = req.body['container-identification']; // single value
  req.session.data['freight-bill'] = req.body['freight-bill'];
  res.redirect('../poc/transport/transport-documents-plane');
});

router.post('../poc/transport/check-your-answers', function (req, res) {
  // You could log, save, or simulate submission here
  console.log('Final submission:', req.session.data);

  // Redirect to a confirmation page
  res.redirect('../poc/catch-certificate-complete');
});

router.get('../poc/catch-certificate-complete', function (req, res) {
  res.render('../poc/catch-certificate-complete');
});

// Helper function to group transport types and attach document arrays
function getGroupedTransportTypes(data) {
  const grouped = {};
  const types = data['transportTypes'] || [];
  types.forEach((t, idx) => {
    // Only attach document arrays to the first entry of each type
    const isFirstOfType = idx === types.findIndex(e => e.type === t.type);
    const entry = { ...t, _originalIndex: idx };
    if (isFirstOfType) {
      if (t.type === 'Truck') {
        entry.documentName = data['documentName[]'] || [];
        entry.referenceNumber = data['referenceNumber[]'] || [];
      } else if (t.type === 'Train') {
        entry.documentName = data['trainDocumentName[]'] || [];
        entry.referenceNumber = data['trainReferenceNumber[]'] || [];
      } else if (t.type === 'Plane') {
        entry.documentName = data['planeDocumentName[]'] || [];
        entry.referenceNumber = data['planeReferenceNumber[]'] || [];
      } else if (t.type === 'Container vessel') {
        entry.documentName = data['vesselDocumentName[]'] || [];
        entry.referenceNumber = data['vesselReferenceNumber[]'] || [];
      }
    } else {
      entry.documentName = [];
      entry.referenceNumber = [];
    }
    if (!grouped[t.type]) grouped[t.type] = [];
    grouped[t.type].push(entry);
  });
  // Remove duplicate document/reference display: only keep docs/refs on first entry of each type
  Object.keys(grouped).forEach(type => {
    grouped[type].forEach((entry, i) => {
      if (i > 0) {
        entry.documentName = [];
        entry.referenceNumber = [];
      }
    });
  });
  return grouped;
}

// Update GET for check-your-answers
router.get('/zeta/transport/check-your-answers', function (req, res) {
  const data = req.session.data;
  const groupedTransportTypes = getGroupedTransportTypes(data);
  res.render('zeta/transport/check-your-answers', {
    data,
    groupedTransportTypes
  });
});

// Update GET for transport-additional
router.get('/zeta/transport/transport-additional', function (req, res) {
  const data = req.session.data;
  const groupedTransportTypes = getGroupedTransportTypes(data);
  res.render('zeta/transport/transport-additional', {
    data,
    groupedTransportTypes
  });
});

//Routes for non-manipulation document (nmd)

// Route for handling the 'Your reference' page
router.post('/zeta/nmd/your-reference', function (req, res) {
  req.session.data['your-reference'] = req.body['your-reference'];
  // Add more fields as needed

  // Redirect based on which button was pressed
  if (req.body._action === 'progress' || req.body['formaction'] === 'progress') {
    res.redirect('/zeta/nmd/progress');
  } else {
    res.redirect('/zeta/nmd/exporter-details');
  }
});

// Route for exporter details
router.post('/zeta/nmd/exporter-details', function (req, res) {
  req.session.data['company-name'] = req.body['company-name']
  // Add more fields as needed
  res.redirect('/zeta/nmd/uk-document')
})

// Route for uk document details
router.post('/zeta/nmd/uk-document', function (req, res) {
  req.session.data['uk-document'] = req.body['uk-document'];

  const issuedInUK = req.body['uk-document'];

  if (issuedInUK === 'Yes') {
    res.redirect('/zeta/nmd/confirm-uk-document');
  } else if (issuedInUK === 'No') {
    res.redirect('/zeta/nmd/confirm-uk-document-2');
  } else {
    res.redirect('/zeta/nmd/uk-document'); // fallback if nothing selected
  }
});


// Route for uk document confirmation
router.post('/zeta/nmd/confirm-uk-document', function (req, res) {
  req.session.data['entry-document-reference'] = req.body['entry-document-reference']
  // Add more fields as needed
  res.redirect('/zeta/nmd/product-details')
});

// Route for uk document confirmation for third country
router.post('/zeta/nmd/confirm-uk-document-2', function (req, res) {
  req.session.data['entry-document-reference-2'] = req.body['entry-document-reference-2']
  // Add more fields as needed
  res.redirect('/zeta/nmd/product-details')
});


// Route for product details
router.post('/zeta/nmd/product-details', function (req, res) {
const newEntry = {
  species: req.body['species'],
  commodityCode: req.body['commodity-code'],
  description: req.body['description'],
  referenceNumber: req.session.data['entry-document-reference'], // ✅ copy from top-level
  productReferenceNumber: req.body['productReferenceNumber'],
  netWeight: req.body['net-weight'],
  fishWeight: req.body['fish-weight']
};


  if (!req.session.data['productEntries']) {
    req.session.data['productEntries'] = [];
  }

  const editIndex = req.session.data['editIndex'];

  if (typeof editIndex !== 'undefined') {
    req.session.data['productEntries'][editIndex] = newEntry;
    delete req.session.data['editIndex'];
  } else {
    req.session.data['productEntries'].push(newEntry);
  }

  // Clear fields
  req.session.data['species'] = '';
  req.session.data['commodity-code'] = '';
  req.session.data['description'] = '';
  req.session.data['productReferenceNumber'] = '';
  req.session.data['net-weight'] = '';
  req.session.data['fish-weight'] = '';

  res.redirect('/zeta/nmd/product-summary');
});



// Route for product summary
router.post('/zeta/nmd/product-summary', function (req, res) {


  // Clear single-entry fields
  req.session.data['species'] = '';
  req.session.data['commodity-code'] = '';
  req.session.data['description'] = '';
  req.session.data['productReferenceNumber'] = '';
  req.session.data['net-weight'] = '';
  req.session.data['fish-weight'] = '';

  req.session.data['more-products'] = req.body['more-products'];

  const productEntries = req.body['more-products'];

  if (productEntries === 'Yes') {
    res.redirect('/zeta/nmd/uk-document');
  } else if (productEntries === 'No') {
    res.redirect('/zeta/nmd/transport-type');
  } else {
    // ✅ Render the summary page directly if no selection
    res.render('product-summary', {
      data: {
        productEntries: req.session.data['productEntries']
      }
    });
  }
});

router.get('/zeta/nmd/remove-product/:index', function (req, res) {
  const index = parseInt(req.params.index);
  if (!isNaN(index) && req.session.data['productEntries']) {
    req.session.data['productEntries'].splice(index, 1);
  }
  res.redirect('/zeta/nmd/product-summary');
});


router.get('/zeta/nmd/edit-product/:index', function (req, res) {
  const index = parseInt(req.params.index);
  const product = req.session.data['productEntries'][index];

  // Pre-fill session fields with selected product
  req.session.data['species'] = product.species;
  req.session.data['commodity-code'] = product.commodityCode;
  req.session.data['description'] = product.description;
  req.session.data['entry-document-reference'] = product.referenceNumber;
  req.session.data['productReferenceNumber'] = product.productReferenceNumber;
  req.session.data['net-weight'] = product.netWeight;
  req.session.data['fish-weight'] = product.fishWeight;

  // Store index for update later
  req.session.data['editIndex'] = index;

  res.redirect('/zeta/nmd/product-details');
});



// Route for handling transport selection
router.post('/zeta/nmd/transport-type', function (req, res) {
  const transportType = req.body['transport-type'];

  if (transportType === 'Truck') {
    res.redirect('/zeta/nmd/transport-truck');
  } else if (transportType === 'Plane') {
    res.redirect('/zeta/nmd/transport-plane');
  } else if (transportType === 'Train') {
    res.redirect('/zeta/nmd/transport-train');
  } else if (transportType === 'Container vessel') {
    res.redirect('/zeta/nmd/transport-container-vessel');
  } else {
    res.redirect('/zeta/nmd/transport-type');  // Redirect back if no option selected

  }
});

// Route for handling truck transport
router.post('/zeta/nmd/transport-truck', function (req, res) {
  req.session.data['truck-nationality'] = req.body['truck-nationality'];
  req.session.data['truck-registration'] = req.body['registration-number'];
  req.session.data['export-place'] = req.body['export-place'];
  req.session.data['freight-number'] = req.body['freight-number'];

  // Add to transportTypes array in session
  req.session.data['transportTypes'] = req.session.data['transportTypes'] || [];
  req.session.data['transportTypes'].push({
    type: 'Truck',
    truckNationality: req.body['truck-nationality'],
    truckRegistration: req.body['registration-number'],
    exportPlace: req.body['export-place'],
    freightBillNumber: req.body['freight-number']
  });
  res.redirect('/zeta/nmd/transport-documents');
});

// Route for handling plane transport
router.post('/zeta/nmd/transport-plane', function (req, res) {
  req.session.data['airway-bill'] = req.body['airway-bill'];
  req.session.data['flight-number'] = req.body['flight-number'];
  req.session.data['plane-departure'] = req.body['plane-departure'];
  req.session.data['container-identification'] = req.body['container-identification'];

  req.session.data['transportTypes'] = req.session.data['transportTypes'] || [];
  req.session.data['transportTypes'].push({
    type: 'Plane',
    flightNumber: req.body['flight-number'],
    planeDeparture: req.body['plane-departure'],
    airwayBill: req.body['airway-bill'],
    containerIdentification: req.body['container-identification']
  });
  res.redirect('/zeta/nmd/transport-documents-plane');
});

// Route for handling train transport
router.post('/zeta/nmd/transport-train', function (req, res) {
  req.session.data['railway-bill'] = req.body['railway-bill'];
  req.session.data['train-departure'] = req.body['train-departure'];
  req.session.data['freight-bill'] = req.body['freight-bill'];

  req.session.data['transportTypes'] = req.session.data['transportTypes'] || [];
  req.session.data['transportTypes'].push({
    type: 'Train',
    railwayBill: req.body['railway-bill'],
    trainDeparture: req.body['train-departure'],
    freightBillNumber: req.body['freight-bill']
  });
  res.redirect('/zeta/nmd/transport-documents-train');
});

// Route for handling container vessel transport
router.post('/zeta/nmd/transport-container-vessel', function (req, res) {
  req.session.data['vessel-name'] = req.body['vessel-name'];
  req.session.data['flag-state'] = req.body['flag-state'];
  req.session.data['container-vessel-departure'] = req.body['container-vessel-departure'];
  req.session.data['freight-bill'] = req.body['freight-bill'];

  req.session.data['transportTypes'] = req.session.data['transportTypes'] || [];
  req.session.data['transportTypes'].push({
    type: 'Container vessel',
    vesselName: req.body['vessel-name'],
    flagState: req.body['flag-state'],
    containerVesselDeparture: req.body['container-vessel-departure'],
    freightBillNumber: req.body['freight-bill']
  });
  res.redirect('/zeta/nmd/transport-documents-vessel');
});


// TRUCK DOCUMENTS
router.post('/zeta/nmd/transport-documents', function (req, res) {
  let documentNames = req.session.data['documentName[]'] || [];
  let referenceNumbers = req.session.data['referenceNumber[]'] || [];

  const names = req.body['documentName[]'] || req.body.documentName;
  const refs = req.body['referenceNumber[]'] || req.body.referenceNumber;
  const editIndex = req.body.editIndex;

  if (editIndex !== undefined && editIndex !== '') {
    documentNames[editIndex] = names;
    referenceNumbers[editIndex] = refs;
  } else {
    if (Array.isArray(names)) {
      documentNames.push(...names);
      referenceNumbers.push(...refs);
    } else {
      documentNames.push(names);
      referenceNumbers.push(refs);
    }
  }

  req.session.data['documentName[]'] = documentNames;
  req.session.data['referenceNumber[]'] = referenceNumbers;

  res.redirect('/zeta/nmd/arrival-details');
});

// TRAIN DOCUMENTS
router.post('/zeta/nmd/transport-documents-train', function (req, res) {
  let documentNames = req.session.data['trainDocumentName[]'] || [];
  let referenceNumbers = req.session.data['trainReferenceNumber[]'] || [];

  const names = req.body['documentName[]'] || req.body.documentName;
  const refs = req.body['referenceNumber[]'] || req.body.referenceNumber;
  const editIndex = req.body.editIndex;

  if (editIndex !== undefined && editIndex !== '') {
    documentNames[editIndex] = names;
    referenceNumbers[editIndex] = refs;
  } else {
    if (Array.isArray(names)) {
      documentNames.push(...names);
      referenceNumbers.push(...refs);
    } else {
      documentNames.push(names);
      referenceNumbers.push(refs);
    }
  }

  req.session.data['trainDocumentName[]'] = documentNames;
  req.session.data['trainReferenceNumber[]'] = referenceNumbers;

  res.redirect('/zeta/nmd/arrival-details');
});

// PLANE DOCUMENTS
router.post('/zeta/nmd/transport-documents-plane', function (req, res) {
  let documentNames = req.session.data['planeDocumentName[]'] || [];
  let referenceNumbers = req.session.data['planeReferenceNumber[]'] || [];

  const names = req.body['documentName[]'] || req.body.documentName;
  const refs = req.body['referenceNumber[]'] || req.body.referenceNumber;
  const editIndex = req.body.editIndex;

  if (editIndex !== undefined && editIndex !== '') {
    documentNames[editIndex] = names;
    referenceNumbers[editIndex] = refs;
  } else {
    if (Array.isArray(names)) {
      documentNames.push(...names);
      referenceNumbers.push(...refs);
    } else {
      documentNames.push(names);
      referenceNumbers.push(refs);
    }
  }

  req.session.data['planeDocumentName[]'] = documentNames;
  req.session.data['planeReferenceNumber[]'] = referenceNumbers;

  res.redirect('/zeta/nmd/arrival-details');
});

// VESSEL DOCUMENTS
router.post('/zeta/nmd/transport-documents-vessel', function (req, res) {
  let documentNames = req.session.data['vesselDocumentName[]'] || [];
  let referenceNumbers = req.session.data['vesselReferenceNumber[]'] || [];

  const names = req.body['documentName[]'] || req.body.documentName;
  const refs = req.body['referenceNumber[]'] || req.body.referenceNumber;
  const editIndex = req.body.editIndex;

  if (editIndex !== undefined && editIndex !== '') {
    documentNames[editIndex] = names;
    referenceNumbers[editIndex] = refs;
  } else {
    if (Array.isArray(names)) {
      documentNames.push(...names);
      referenceNumbers.push(...refs);
    } else {
      documentNames.push(names);
      referenceNumbers.push(refs);
    }
  }

  req.session.data['vesselDocumentName[]'] = documentNames;
  req.session.data['vesselReferenceNumber[]'] = referenceNumbers;

  res.redirect('/zeta/nmd/arrival-details');
});

// Route for handling the storage facility arrival page
router.post('/zeta/nmd/arrival-details', function (req, res) {
  req.session.data['departure-country'] = req.body['departure-country'];
    req.session.data['departure-location'] = req.body['departure-location'];
      req.session.data['storage-location'] = req.body['storage-location'];

      // Combine departure date
const departureDay = req.body['departure-date-day'];
const departureMonth = req.body['departure-date-month'];
const departureYear = req.body['departure-date-year'];
req.session.data['departure-date'] = `${departureDay}/${departureMonth}/${departureYear}`;

// Combine arrival date
const arrivalDay = req.body['arrival-date-day'];
const arrivalMonth = req.body['arrival-date-month']; // fix typo in HTML
const arrivalYear = req.body['arrival-date-year'];
req.session.data['arrival-date'] = `${arrivalDay}/${arrivalMonth}/${arrivalYear}`;

  // Add more fields as needed

  // Redirect based on which button was pressed
  if (req.body._action === 'progress' || req.body['formaction'] === 'progress') {
    res.redirect('/zeta/nmd/progress');
  } else {
    res.redirect('/zeta/nmd/storage-facility-details');
  }
});

// Route for storage facility details
router.post('/zeta/nmd/storage-facility-details', function (req, res) {
  req.session.data['facility-name'] = req.body['facility-name'];
  // Add more fields as needed
  res.redirect('/zeta/nmd/storage-facility-address');
});

// Route for storage facility details
router.post('/zeta/nmd/storage-facility-address', function (req, res) {
  req.session.data['postcode'] = req.body['postcode'];
  // Add more fields as needed
  res.redirect('/zeta/nmd/storage-facility-address-2');
});

// Route for storage facility address
router.post('/zeta/nmd/storage-facility-address-2', function (req, res) {
  req.session.data['building-number'] = req.body['building-number'];
  req.session.data['building-name'] = req.body['building-name'];
  req.session.data['sub-building-name'] = req.body['sub-building-name'];
  req.session.data['street-name'] = req.body['street-name'];
  req.session.data['county'] = req.body['county'];
  req.session.data['country'] = req.body['country'];
  // Add more fields as needed
  res.redirect('/zeta/nmd/storage-facility-confirmation');
});

// Route for storage facility confirmation
router.post('/zeta/nmd/storage-facility-confirmation', function (req, res) {
  
  // Add more fields as needed
  res.redirect('/zeta/nmd/storage-facility-approval');
});


// Route for storage facility approval
// Route for storage facility approval
router.post('/zeta/nmd/storage-facility-approval', function (req, res) {
  let storageTypes = [].concat(req.body['product-storage'] || []);
  storageTypes = storageTypes.filter(item => item !== '_unchecked');
  req.session.data['product-storage'] = storageTypes;
  res.redirect('/zeta/nmd/storage-facility-summary');
});



// Route for storage facility summary
router.post('/zeta/nmd/storage-facility-summary', function (req, res) {
  // Get current values from session
  const facilityName = req.session.data['facility-name'];
  const addAnother = req.body['storage-facility']; // Yes or No

  // Create a new facility entry
  const newFacility = {
    name: facilityName,
  };

  // Save to session array
  if (!req.session.data['storageFacilities']) {
    req.session.data['storageFacilities'] = [];
  }

  req.session.data['storageFacilities'].push(newFacility);

  // Redirect based on user choice
  if (addAnother === 'Yes') {
    res.redirect('/zeta/nmd/storage-facility-details');
  } else if (addAnother === 'No') {
    res.redirect('/zeta/nmd/departure-summary');
  } else {
    res.redirect('/zeta/nmd/storage-facility-summary');
  }
});

// Route for departure details
router.post('/zeta/nmd/departure-details', function (req, res) {
  // Capture date parts
  const day = req.body['departure-date-uk-day'];
  const month = req.body['departure-date-uk-month'];
  const year = req.body['departure-date-uk-year'];

  // Combine into a single date string (optional formatting)
  const departureDate = `${day}/${month}/${year}`;
  req.session.data['departure-date-uk'] = departureDate;

  // Capture departure location
  req.session.data['departure-location-uk'] = req.body['departure-location-uk'];

  // Redirect to the next step
  res.redirect('/zeta/nmd/departure-destination');
});


// Route for departure summary
router.post('/zeta/nmd/departure-summary', function (req, res) {
  const productEntries = req.session.data['productEntries'];

  if (productEntries && Array.isArray(productEntries)) {
    productEntries.forEach((entry, index) => {
      const netWeightKey = `departure-net-weight-${index}`;
      const fishWeightKey = `departure-fish-weight-${index}`;

      entry.departureNetWeight = req.body[netWeightKey];
      entry.departureFishWeight = req.body[fishWeightKey];
    });
  }

  res.redirect('/zeta/nmd/departure-details');
});


// Route for consignment destination
router.post('/zeta/nmd/departure-destination', function (req, res) {
  // Capture the destination country
  const destinationCountry = req.body['departure-destination-country'];

  // Save to session
  req.session.data['departure-destination-country'] = destinationCountry;

  // Redirect to the next step in the journey
  res.redirect('/zeta/nmd/departure-transport-type');
});

router.post('/zeta/nmd/departure-transport-type', function (req, res) {
  const transportType = req.body['departure-transport-type'];

  if (transportType === 'Truck') {
    res.redirect('/zeta/nmd/departure-transport-truck');
  } else if (transportType === 'Plane') {
    res.redirect('/zeta/nmd/departure-transport-plane');
  } else if (transportType === 'Train') {
    res.redirect('/zeta/nmd/departure-transport-train');
  } else if (transportType === 'Container vessel') {
    res.redirect('/zeta/nmd/departure-transport-container-vessel');
  } else {
    res.redirect('/zeta/nmd/departure-transport-type');
  }
});

router.post('/zeta/nmd/departure-transport-truck', function (req, res) {
  req.session.data['departure-truck-nationality'] = req.body['truck-nationality'];
  req.session.data['departure-truck-registration'] = req.body['registration-number'];
  req.session.data['departure-export-place'] = req.body['export-place'];
  req.session.data['departure-freight-number'] = req.body['freight-number'];

  res.redirect('/zeta/nmd/departure-transport-documents');
});

router.post('/zeta/nmd/departure-transport-plane', function (req, res) {
  req.session.data['departure-airway-bill'] = req.body['airway-bill'];
  req.session.data['departure-flight-number'] = req.body['flight-number'];
  req.session.data['departure-plane-departure'] = req.body['plane-departure'];
  req.session.data['departure-container-identification'] = req.body['container-identification'];

  res.redirect('/zeta/nmd/departure-transport-documents-plane');
});

router.post('/zeta/nmd/departure-transport-train', function (req, res) {
  req.session.data['departure-railway-bill'] = req.body['railway-bill'];
  req.session.data['departure-train-departure'] = req.body['train-departure'];
  req.session.data['departure-freight-bill'] = req.body['freight-bill'];

  res.redirect('/zeta/nmd/departure-transport-documents-train');
});

router.post('/zeta/nmd/departure-transport-container-vessel', function (req, res) {
  req.session.data['departure-vessel-name'] = req.body['vessel-name'];
  req.session.data['departure-flag-state'] = req.body['flag-state'];
  req.session.data['departure-container-vessel-departure'] = req.body['container-vessel-departure'];
  req.session.data['departure-freight-bill'] = req.body['departure-freight-bill'];

  res.redirect('/zeta/nmd/departure-transport-documents-vessel');
});

router.post('/zeta/nmd/departure-transport-documents', function (req, res) {
  let documentNames = req.session.data['departure-documentName[]'] || [];
  let referenceNumbers = req.session.data['departure-referenceNumber[]'] || [];

  const names = req.body['documentName[]'] || req.body.documentName;
  const refs = req.body['referenceNumber[]'] || req.body.referenceNumber;
  const editIndex = req.body.editIndex;

  if (editIndex !== undefined && editIndex !== '') {
    documentNames[editIndex] = names;
    referenceNumbers[editIndex] = refs;
  } else {
    if (Array.isArray(names)) {
      documentNames.push(...names);
      referenceNumbers.push(...refs);
    } else {
      documentNames.push(names);
      referenceNumbers.push(refs);
    }
  }

  req.session.data['departure-documentName[]'] = documentNames;
  req.session.data['departure-referenceNumber[]'] = referenceNumbers;

  res.redirect('/zeta/nmd/progress');
});

router.post('/zeta/nmd/departure-transport-documents-plane', function (req, res) {
  let documentNames = req.session.data['departure-planeDocumentName[]'] || [];
  let referenceNumbers = req.session.data['departure-planeReferenceNumber[]'] || [];

  const names = req.body['documentName[]'] || req.body.documentName;
  const refs = req.body['referenceNumber[]'] || req.body.referenceNumber;
  const editIndex = req.body.editIndex;

  if (editIndex !== undefined && editIndex !== '') {
    documentNames[editIndex] = names;
    referenceNumbers[editIndex] = refs;
  } else {
    if (Array.isArray(names)) {
      documentNames.push(...names);
      referenceNumbers.push(...refs);
    } else {
      documentNames.push(names);
      referenceNumbers.push(refs);
    }
  }

  req.session.data['departure-planeDocumentName[]'] = documentNames;
  req.session.data['departure-planeReferenceNumber[]'] = referenceNumbers;

  res.redirect('/zeta/nmd/progress');
});

router.post('/zeta/nmd/departure-transport-documents-train', function (req, res) {
  let documentNames = req.session.data['departure-trainDocumentName[]'] || [];
  let referenceNumbers = req.session.data['departure-trainReferenceNumber[]'] || [];

  const names = req.body['documentName[]'] || req.body.documentName;
  const refs = req.body['referenceNumber[]'] || req.body.referenceNumber;
  const editIndex = req.body.editIndex;

  if (editIndex !== undefined && editIndex !== '') {
    documentNames[editIndex] = names;
    referenceNumbers[editIndex] = refs;
  } else {
    if (Array.isArray(names)) {
      documentNames.push(...names);
      referenceNumbers.push(...refs);
    } else {
      documentNames.push(names);
      referenceNumbers.push(refs);
    }
  }

  req.session.data['departure-trainDocumentName[]'] = documentNames;
  req.session.data['departure-trainReferenceNumber[]'] = referenceNumbers;

  res.redirect('/zeta/nmd/progress');
});

router.post('/zeta/nmd/departure-transport-documents-vessel', function (req, res) {
  let documentNames = req.session.data['departure-vesselDocumentName[]'] || [];
  let referenceNumbers = req.session.data['departure-vesselReferenceNumber[]'] || [];

  const names = req.body['documentName[]'] || req.body.documentName;
  const refs = req.body['referenceNumber[]'] || req.body.referenceNumber;
  const editIndex = req.body.editIndex;

  if (editIndex !== undefined && editIndex !== '') {
    documentNames[editIndex] = names;
    referenceNumbers[editIndex] = refs;
  } else {
    if (Array.isArray(names)) {
      documentNames.push(...names);
      referenceNumbers.push(...refs);
    } else {
      documentNames.push(names);
      referenceNumbers.push(refs);
    }
  }

  req.session.data['departure-vesselDocumentName[]'] = documentNames;
  req.session.data['departure-vesselReferenceNumber[]'] = referenceNumbers;

  res.redirect('/zeta/nmd/progress');
});


router.get('/zeta/nmd/progress', function (req, res) {
  res.render('zeta/nmd/progress.html', {
    data: req.session.data
  });
});
router.post('/zeta/nmd/progress', function (req, res) {
  // Handle the progress form submission
  const action = req.body._action || req.body.formaction;

  if (action === 'progress') {
    // Redirect to the next step in the journey
    res.redirect('/zeta/nmd/check-your-answers');
  } else {
    // Redirect to the previous step or stay on the same page
    res.redirect('/zeta/nmd/progress');
  }
});


// Route for handling the 'Your reference' page
router.post('/zeta/sd/your-reference', function (req, res) {
  req.session.data['your-reference'] = req.body['your-reference'];
  // Add more fields as needed

  // Redirect based on which button was pressed
  if (req.body._action === 'progress' || req.body['formaction'] === 'progress') {
    res.redirect('/zeta/sd/progress');
  } else {
    res.redirect('/zeta/sd/exporter-details');
  }
});

// Route for exporter details
router.post('/zeta/sd/exporter-details', function (req, res) {
  req.session.data['company-name'] = req.body['company-name']
  // Add more fields as needed
  res.redirect('/zeta/sd/product-details')
})

// GET handler for zeta/sd/product-details
router.get('/zeta/sd/product-details', function (req, res) {
  res.render('zeta/sd/product-details', { data: req.session.data });
  delete req.session.data['formErrors'];
});

// Route for product details
router.post('/zeta/sd/product-details', function (req, res) {
  // Validation for weight fields
  const errors = [];

  if (!req.body['entry-document-type'] || req.body['entry-document-type'] === '') {
    errors.push({
      fieldName: 'entry-document-type',
      message: 'Select which entry document you used'
    });
  }

  if (!req.body['entry-weight'] || req.body['entry-weight'] === '') {
    errors.push({
      fieldName: 'entry-weight',
      message: 'Enter the weight on the document in kg'
    });
  }

  if (!req.body['net-weight'] || req.body['net-weight'] === '') {
    errors.push({
      fieldName: 'net-weight',
      message: 'Enter the net weight of product on arrival'
    });
  }

  if (!req.body['fish-weight'] || req.body['fish-weight'] === '') {
    errors.push({
      fieldName: 'fish-weight',
      message: 'Enter the net weight of fishery products on arrival'
    });
  }

  // Check that fish-weight does not exceed net-weight
  if (req.body['fish-weight'] && req.body['net-weight']) {
    if (parseFloat(req.body['fish-weight']) > parseFloat(req.body['net-weight'])) {
      errors.push({
        fieldName: 'fish-weight',
        message: 'Fishery products net weight on arrival cannot exceed the product net weight on arrival'
      });
    }
  }

  if (errors.length > 0) {
    req.session.data['formErrors'] = errors;
    return res.redirect('/zeta/sd/product-details');
  }

  const newEntry = {
    entryDocumentType: req.body['entry-document-type'], // which document type was used
    ukDocument: req.body['uk-document'], // now collected here
    issuingCountry: req.body['issuing-country'], // <-- add this line
    entryDocumentReference: req.body['entry-document-reference'], // now collected here
    entryWeight: req.body['entry-weight'], // <-- add this line
    species: req.body['species'],
    commodityCode: req.body['commodity-code'],
    description: req.body['description'],
    productReferenceNumber: req.body['productReferenceNumber'],
    netWeight: req.body['net-weight'],
    fishWeight: req.body['fish-weight']
  };

  // Separate from productEntries, which the PS and catch journeys also write to
  if (!req.session.data['sdProductEntries']) {
    req.session.data['sdProductEntries'] = [];
  }

  const editIndex = req.session.data['editIndex'];

  if (typeof editIndex !== 'undefined') {
    req.session.data['sdProductEntries'][editIndex] = newEntry;
    delete req.session.data['editIndex'];
  } else {
    req.session.data['sdProductEntries'].push(newEntry);
  }

  // Clear fields and errors
  req.session.data['entry-document-type'] = '';
  req.session.data['uk-document'] = '';
  req.session.data['issuing-country'] = '';
  req.session.data['entry-document-reference'] = '';
  req.session.data['entry-weight'] = '';
  req.session.data['species'] = '';
  req.session.data['commodity-code'] = '';
  req.session.data['description'] = '';
  req.session.data['productReferenceNumber'] = '';
  req.session.data['net-weight'] = '';
  req.session.data['fish-weight'] = '';
  delete req.session.data['formErrors'];

  res.redirect('/zeta/sd/product-summary');
});




// GET handler for zeta/sd/product-summary
router.get('/zeta/sd/product-summary', function (req, res) {
  res.render('zeta/sd/product-summary', { data: req.session.data });
});

// Route for product summary
router.post('/zeta/sd/product-summary', function (req, res) {
  // Clear single-entry fields
  req.session.data['uk-document'] = '';
  req.session.data['issuing-country'] = '';
  req.session.data['entry-document-reference'] = '';
  req.session.data['entry-weight'] = '';
  req.session.data['productReferenceNumber'] = '';
  req.session.data['species'] = '';
  req.session.data['commodity-code'] = '';
  req.session.data['description'] = '';
  req.session.data['net-weight'] = '';
  req.session.data['fish-weight'] = '';
  delete req.session.data['editIndex'];

  req.session.data['more-products'] = req.body['more-products'];

  const productEntries = req.body['more-products'];

  if (productEntries === 'Yes') {
    res.redirect('/zeta/sd/product-details'); // ✅ stays in SD flow
  } else if (productEntries === 'No') {
    res.redirect('/zeta/sd/transport-type');
  } else {
    // ✅ No selection made — redirect to GET route
    res.redirect('/zeta/sd/product-summary');
  }
});

router.get('/zeta/sd/edit-product/:index', function (req, res) {
  const index = parseInt(req.params.index);
  const product = req.session.data['sdProductEntries'][index];

  // Pre-fill session fields with selected product
  req.session.data['entry-document-type'] = product.entryDocumentType;
  req.session.data['uk-document'] = product.ukDocument;
  req.session.data['issuing-country'] = product.issuingCountry;
  req.session.data['entry-document-reference'] = product.entryDocumentReference;
  req.session.data['entry-weight'] = product.entryWeight;
  req.session.data['productReferenceNumber'] = product.productReferenceNumber;
  req.session.data['species'] = product.species;
  req.session.data['commodity-code'] = product.commodityCode;
  req.session.data['description'] = product.description;
  req.session.data['net-weight'] = product.netWeight;
  req.session.data['fish-weight'] = product.fishWeight;

  // Store index for update later
  req.session.data['editIndex'] = index;

  res.redirect('/zeta/sd/product-details');
});


router.get('/zeta/sd/remove-product/:index', function (req, res) {
  const index = parseInt(req.params.index);
  if (!isNaN(index) && req.session.data['sdProductEntries']) {
    req.session.data['sdProductEntries'].splice(index, 1);
  }
  res.redirect('/zeta/sd/product-summary');
});



// Route for handling transport selection
router.post('/zeta/sd/transport-type', function (req, res) {
  const transportType = req.body['transport-type'];

  if (transportType === 'Truck') {
    res.redirect('/zeta/sd/transport-truck');
  } else if (transportType === 'Plane') {
    res.redirect('/zeta/sd/transport-plane');
  } else if (transportType === 'Train') {
    res.redirect('/zeta/sd/transport-train');
  } else if (transportType === 'Container vessel') {
    res.redirect('/zeta/sd/transport-container-vessel');
  } else {
    res.redirect('/zeta/sd/transport-type');  // Redirect back if no option selected

  }
});

// Route for handling truck transport
router.post('/zeta/sd/transport-truck', function (req, res) {
  req.session.data['departure-country'] = req.body['departure-country'];
  req.session.data['truck-nationality'] = req.body['truck-nationality'];
  req.session.data['truck-registration'] = req.body['registration-number'];
  req.session.data['export-place'] = req.body['export-place'];
  req.session.data['unloading-place'] = req.body['unloading-place'];
  req.session.data['freight-number'] = req.body['freight-number'];

        // Combine departure date
const departureDay = req.body['departure-date-day'];
const departureMonth = req.body['departure-date-month'];
const departureYear = req.body['departure-date-year'];
req.session.data['departure-date'] = `${departureDay}/${departureMonth}/${departureYear}`;

  // Add to transportTypes array in session
  req.session.data['transportTypes'] = req.session.data['transportTypes'] || [];
  req.session.data['transportTypes'].push({
    type: 'Truck',
    departureCountry: req.body['departure-country'],
    truckNationality: req.body['truck-nationality'],
    truckRegistration: req.body['registration-number'],
    exportPlace: req.body['export-place'],
    unloadingPlace: req.body['unloading-place'],
    freightBillNumber: req.body['freight-number'],
    departureDate: req.session.data['departure-date']
  });
  res.redirect('/zeta/sd/transport-documents');
});

// Route for handling plane transport
router.post('/zeta/sd/transport-plane', function (req, res) {
  req.session.data['plane-departure-country'] = req.body['plane-departure-country'];
  req.session.data['unloading-place-plane'] = req.body['unloading-place-plane'];
  req.session.data['airway-bill'] = req.body['airway-bill'];
  req.session.data['flight-number'] = req.body['flight-number'];
  req.session.data['plane-departure'] = req.body['plane-departure'];
  req.session.data['container-identification'] = req.body['container-identification'];

          // Combine plane departure date
  const departureDay = req.body['plane-departure-date-day'];
  const departureMonth = req.body['plane-departure-date-month'];
  const departureYear = req.body['plane-departure-date-year'];
  req.session.data['plane-departure-date'] = `${departureDay}/${departureMonth}/${departureYear}`;

  req.session.data['transportTypes'] = req.session.data['transportTypes'] || [];
  req.session.data['transportTypes'].push({
    type: 'Plane',
    planeDepartureCountry: req.body['plane-departure-country'],
    flightNumber: req.body['flight-number'],
    planeDeparture: req.body['plane-departure'],
    airwayBill: req.body['airway-bill'],
    unloadingPlacePlane: req.body['unloading-place-plane'],
    containerIdentification: req.body['container-identification'],
    planeDepartureDate: req.session.data['plane-departure-date']
  });
  res.redirect('/zeta/sd/transport-documents-plane');
});

// Route for handling train transport
router.post('/zeta/sd/transport-train', function (req, res) {
  req.session.data['train-departure-country'] = req.body['train-departure-country'];
  req.session.data['railway-bill'] = req.body['railway-bill'];
  req.session.data['train-departure'] = req.body['train-departure'];
  req.session.data['unloading-place-train'] = req.body['unloading-place-train'];
  req.session.data['freight-bill'] = req.body['freight-bill'];

      // Combine train departure date
  const departureDay = req.body['train-departure-date-day'];
  const departureMonth = req.body['train-departure-date-month'];
  const departureYear = req.body['train-departure-date-year'];
  req.session.data['train-departure-date'] = `${departureDay}/${departureMonth}/${departureYear}`;

  req.session.data['transportTypes'] = req.session.data['transportTypes'] || [];
  req.session.data['transportTypes'].push({
    type: 'Train',
    trainDepartureCountry: req.body['train-departure-country'],
    railwayBill: req.body['railway-bill'],
    trainDeparture: req.body['train-departure'],
    unloadingPlaceTrain: req.body['unloading-place-train'],
    freightBillNumber: req.body['freight-bill'],
    trainDepartureDate: req.session.data['train-departure-date']
  });
  res.redirect('/zeta/sd/transport-documents-train');
});

// Route for handling container vessel transport
router.post('/zeta/sd/transport-container-vessel', function (req, res) {
  req.session.data['container-vessel-departure-country'] = req.body['container-vessel-departure-country'];
  req.session.data['unloading-place-vessel'] = req.body['unloading-place-vessel'];
  req.session.data['vessel-name'] = req.body['vessel-name'];
  req.session.data['flag-state'] = req.body['flag-state'];
  req.session.data['container-vessel-departure'] = req.body['container-vessel-departure'];
  req.session.data['freight-bill'] = req.body['vessel-freight-bill'];

      // Combine container vessel departure date
  const departureDay = req.body['container-vessel-departure-date-day'];
  const departureMonth = req.body['container-vessel-departure-date-month'];
  const departureYear = req.body['container-vessel-departure-date-year'];
  req.session.data['container-vessel-departure-date'] = `${departureDay}/${departureMonth}/${departureYear}`;

  req.session.data['transportTypes'] = req.session.data['transportTypes'] || [];
  req.session.data['transportTypes'].push({
    type: 'Container vessel',
    containerVesselDepartureCountry: req.body['container-vessel-departure-country'],
    vesselName: req.body['vessel-name'],
    flagState: req.body['flag-state'],
    unloadingPlaceVessel: req.body['unloading-place-vessel'],
    containerVesselDeparture: req.body['container-vessel-departure'],
    freightBillNumber: req.body['vessel-freight-bill'],
    containerVesselDepartureDate: req.session.data['container-vessel-departure-date']
  });
  res.redirect('/zeta/sd/transport-documents-vessel');
});


// TRUCK DOCUMENTS
router.post('/zeta/sd/transport-documents', function (req, res) {
  let documentNames = req.session.data['documentName[]'] || [];
  let referenceNumbers = req.session.data['referenceNumber[]'] || [];

  const names = req.body['documentName[]'] || req.body.documentName;
  const refs = req.body['referenceNumber[]'] || req.body.referenceNumber;
  const editIndex = req.body.editIndex;

  if (editIndex !== undefined && editIndex !== '') {
    documentNames[editIndex] = names;
    referenceNumbers[editIndex] = refs;
  } else {
    if (Array.isArray(names)) {
      documentNames.push(...names);
      referenceNumbers.push(...refs);
    } else {
      documentNames.push(names);
      referenceNumbers.push(refs);
    }
  }

  req.session.data['documentName[]'] = documentNames;
  req.session.data['referenceNumber[]'] = referenceNumbers;

  res.redirect('/zeta/sd/api-storage');
});

// TRAIN DOCUMENTS
router.post('/zeta/sd/transport-documents-train', function (req, res) {
  let documentNames = req.session.data['trainDocumentName[]'] || [];
  let referenceNumbers = req.session.data['trainReferenceNumber[]'] || [];

  const names = req.body['documentName[]'] || req.body.documentName;
  const refs = req.body['referenceNumber[]'] || req.body.referenceNumber;
  const editIndex = req.body.editIndex;

  if (editIndex !== undefined && editIndex !== '') {
    documentNames[editIndex] = names;
    referenceNumbers[editIndex] = refs;
  } else {
    if (Array.isArray(names)) {
      documentNames.push(...names);
      referenceNumbers.push(...refs);
    } else {
      documentNames.push(names);
      referenceNumbers.push(refs);
    }
  }

  req.session.data['trainDocumentName[]'] = documentNames;
  req.session.data['trainReferenceNumber[]'] = referenceNumbers;

  res.redirect('/zeta/sd/api-storage');
});

// PLANE DOCUMENTS
router.post('/zeta/sd/transport-documents-plane', function (req, res) {
  let documentNames = req.session.data['planeDocumentName[]'] || [];
  let referenceNumbers = req.session.data['planeReferenceNumber[]'] || [];

  const names = req.body['documentName[]'] || req.body.documentName;
  const refs = req.body['referenceNumber[]'] || req.body.referenceNumber;
  const editIndex = req.body.editIndex;

  if (editIndex !== undefined && editIndex !== '') {
    documentNames[editIndex] = names;
    referenceNumbers[editIndex] = refs;
  } else {
    if (Array.isArray(names)) {
      documentNames.push(...names);
      referenceNumbers.push(...refs);
    } else {
      documentNames.push(names);
      referenceNumbers.push(refs);
    }
  }

  req.session.data['planeDocumentName[]'] = documentNames;
  req.session.data['planeReferenceNumber[]'] = referenceNumbers;

  res.redirect('/zeta/sd/api-storage');
});

// VESSEL DOCUMENTS
router.post('/zeta/sd/transport-documents-vessel', function (req, res) {
  let documentNames = req.session.data['vesselDocumentName[]'] || [];
  let referenceNumbers = req.session.data['vesselReferenceNumber[]'] || [];

  const names = req.body['documentName[]'] || req.body.documentName;
  const refs = req.body['referenceNumber[]'] || req.body.referenceNumber;
  const editIndex = req.body.editIndex;

  if (editIndex !== undefined && editIndex !== '') {
    documentNames[editIndex] = names;
    referenceNumbers[editIndex] = refs;
  } else {
    if (Array.isArray(names)) {
      documentNames.push(...names);
      referenceNumbers.push(...refs);
    } else {
      documentNames.push(names);
      referenceNumbers.push(refs);
    }
  }

  req.session.data['vesselDocumentName[]'] = documentNames;
  req.session.data['vesselReferenceNumber[]'] = referenceNumbers;

  res.redirect('/zeta/sd/api-storage');
});


// Route for storage facility details
router.post('/zeta/sd/storage-facility-details', function (req, res) {
  if (req.body['facility-name']) req.session.data['facility-name'] = req.body['facility-name'];
  req.session.data['approval-number'] = req.body['approval-number'] ||
    (req.session.data['facility-api-selected'] ? req.session.data['facility-api-approval-number'] : '') || '';
  req.session.data['product-storage'] = req.body['product-storage'];

  // Combine arrival date
const arrivalDay = req.body['arrival-date-day'];
const arrivalMonth = req.body['arrival-date-month']; // fix typo in HTML
const arrivalYear = req.body['arrival-date-year'];
req.session.data['arrival-date'] = `${arrivalDay}/${arrivalMonth}/${arrivalYear}`;
  // Add more fields as needed
  res.redirect('/zeta/sd/departure-transport-type');
});

// API storage facility lookup (start of the storage facility journey)
router.get('/zeta/sd/api-storage', function (req, res) {
  const formErrors = req.session.data.formErrors;
  if (!formErrors) {
    delete req.session.data['api-storage-search'];
    delete req.session.data['api-facility-name'];
    delete req.session.data['facility-name'];
    delete req.session.data['approval-number'];
    delete req.session.data['facility-api-approval-number'];
    delete req.session.data['building-number'];
    delete req.session.data['building-name'];
    delete req.session.data['street-name'];
    delete req.session.data['town-city'];
    delete req.session.data['postcode'];
    delete req.session.data['facility-api-selected'];
  }
  res.render('zeta/sd/api-storage', { data: req.session.data });
  delete req.session.data.formErrors;
});

router.post('/zeta/sd/api-storage', function (req, res) {
  if (!req.body['storage-facility-name']) {
    req.session.data.formErrors = [{
      fieldName: 'storage-facility-search',
      message: 'You must select a storage facility or enter the facility details manually'
    }];
    return res.redirect('/zeta/sd/api-storage');
  }
  req.session.data['api-storage-search'] = req.body['storage-facility-search'];
  req.session.data['api-facility-name'] = req.body['storage-facility-name'];
  req.session.data['facility-name'] = req.body['storage-facility-name'];
  req.session.data['approval-number'] = req.body['storage-facility-approval-number'];
  req.session.data['facility-api-approval-number'] = req.body['storage-facility-approval-number'];
  req.session.data['building-number'] = req.body['storage-facility-building-number'];
  req.session.data['building-name'] = req.body['storage-facility-building-name'];
  req.session.data['street-name'] = req.body['storage-facility-street-name'];
  req.session.data['town-city'] = req.body['storage-facility-town-city'];
  req.session.data['postcode'] = req.body['storage-facility-postcode'];
  req.session.data['facility-api-selected'] = true;
  // API result already includes the address, so continue straight to the facility details (arrival date)
  res.redirect('/zeta/sd/storage-facility-details');
});

// Route for storage facility details
router.post('/zeta/sd/storage-facility-address', function (req, res) {
  const postcode = (req.body['postcode'] || '').trim().toUpperCase().replace(/\s+/g, ' ');
  const ukPostcodePattern = /^(GIR 0AA|[A-Z]{1,2}\d[A-Z\d]?\s?\d[ABD-HJLNP-UW-Z]{2})$/;
  if (!ukPostcodePattern.test(postcode)) {
    req.session.data['postcode'] = req.body['postcode'];
    req.session.data.formErrors = [{ fieldName: 'postcode', message: 'Enter a valid UK postcode' }];
    return res.redirect('/zeta/sd/storage-facility-address');
  }
  req.session.data.formErrors = [];
  delete req.session.data['approval-number'];
  delete req.session.data['facility-api-approval-number'];
  delete req.session.data['facility-api-selected'];
  req.session.data['postcode'] = postcode;
  if (req.body['postcode'] === 'GR12 2AB') {
    req.session.data['building-number'] = '123';
    req.session.data['building-name'] = '';
    req.session.data['street-name'] = 'Storage Road';
    req.session.data['town-city'] = 'Grimsby';
  }
  // Add more fields as needed
  res.redirect('/zeta/sd/storage-facility-address-2');
});

// Route for storage facility address
router.post('/zeta/sd/storage-facility-address-2', function (req, res) {
  const postcode = (req.body['postcode'] || '').trim().toUpperCase().replace(/\s+/g, ' ');
  const country = (req.body['country'] || '').trim().toLowerCase();
  const ukPostcodePattern = /^(GIR 0AA|[A-Z]{1,2}\d[A-Z\d]?\s?\d[ABD-HJLNP-UW-Z]{2})$/;
  const ukCountries = ['uk', 'u.k.', 'united kingdom', 'gb', 'g.b.'];
  const formErrors = [];

  if (!ukPostcodePattern.test(postcode)) {
    formErrors.push({ fieldName: 'postcode', message: 'Enter a valid UK postcode' });
  }
  if (!ukCountries.includes(country)) {
    formErrors.push({ fieldName: 'country', message: 'Enter UK as the country' });
  }
  if (formErrors.length) {
    req.session.data.formErrors = formErrors;
    return res.redirect('/zeta/sd/storage-facility-address-2');
  }

  req.session.data.formErrors = [];
  req.session.data['building-number'] = req.body['building-number'];
  req.session.data['building-name'] = req.body['building-name'];
  req.session.data['sub-building-name'] = req.body['sub-building-name'];
  req.session.data['street-name'] = req.body['street-name'];
  req.session.data['town-city'] = req.body['town-city'];
  req.session.data['county'] = req.body['county'];
  req.session.data['postcode'] = postcode;
  req.session.data['country'] = 'United Kingdom';
  // Add more fields as needed
  res.redirect('/zeta/sd/storage-facility-details');
});

// Route for storage facility summary
router.post('/zeta/sd/storage-facility-summary', function (req, res) {
  // Get current values from session
  const facilityName = req.session.data['facility-name'];
  const addAnother = req.body['storage-facility']; // Yes or No

  // Create a new facility entry
  const newFacility = {
    name: facilityName,
  };

  // Save to session array
  if (!req.session.data['storageFacilities']) {
    req.session.data['storageFacilities'] = [];
  }

  req.session.data['storageFacilities'].push(newFacility);

  // Redirect based on user choice
  if (addAnother === 'Yes') {
    res.redirect('/zeta/sd/storage-facility-details');
  } else if (addAnother === 'No') {
    res.redirect('/zeta/sd/departure-transport-type');
  } else {
    res.redirect('/zeta/sd/storage-facility-summary');
  }
});

// Route for departure transport details
router.post('/zeta/sd/departure-transport-type', function (req, res) {
  const transportType = req.body['departure-transport-type'];

  if (transportType === 'Truck') {
    res.redirect('/zeta/sd/departure-transport-truck');
  } else if (transportType === 'Plane') {
    res.redirect('/zeta/sd/departure-transport-plane');
  } else if (transportType === 'Train') {
    res.redirect('/zeta/sd/departure-transport-train');
  } else if (transportType === 'Container vessel') {
    res.redirect('/zeta/sd/departure-transport-container-vessel');
  } else {
    res.redirect('/zeta/sd/departure-transport-type');
  }
});


router.post('/zeta/sd/departure-transport-truck', function (req, res) {
  req.session.data['departure-destination-country'] = req.body['departure-destination-country'];
  req.session.data['destination-point-truck'] = req.body['destination-point-truck'];
  req.session.data['departure-truck-nationality'] = req.body['departure-truck-nationality'];
  req.session.data['departure-truck-registration'] = req.body['departure-truck-registration'];
  req.session.data['departure-export-place'] = req.body['departure-export-place'];
  req.session.data['departure-freight-number'] = req.body['departure-freight-number'];
  req.session.data['departure-container-identification-truck'] = req.body['departure-container-identification-truck'];


  const destinationCountry = req.body['departure-destination-country'];

  // Capture date parts
  const day = req.body['departure-date-uk-day'];
  const month = req.body['departure-date-uk-month'];
  const year = req.body['departure-date-uk-year'];

  // Combine into a single date string (optional formatting)
  const departureDate = `${day}/${month}/${year}`;
  req.session.data['departure-date-uk'] = departureDate;
  

  res.redirect('/zeta/sd/departure-transport-documents');
});

router.post('/zeta/sd/departure-transport-plane', function (req, res) {
  req.session.data['plane-departure-destination-country'] = req.body['plane-departure-destination-country'];
  req.session.data['destination-point-plane'] = req.body['destination-point-plane'];
  req.session.data['departure-airway-bill'] = req.body['departure-airway-bill'];
  req.session.data['departure-flight-number'] = req.body['departure-flight-number'];
  req.session.data['departure-plane-departure'] = req.body['departure-plane-departure'];
  req.session.data['departure-container-identification'] = req.body['departure-container-identification'];

    // Capture date parts
  const day = req.body['plane-departure-date-uk-day'];
  const month = req.body['plane-departure-date-uk-month'];
  const year = req.body['plane-departure-date-uk-year'];

  // Combine into a single date string (optional formatting)
  const departureDate = `${day}/${month}/${year}`;
  req.session.data['plane-departure-date-uk'] = departureDate;

  res.redirect('/zeta/sd/departure-transport-documents-plane');
});

router.post('/zeta/sd/departure-transport-train', function (req, res) {
  req.session.data['train-departure-destination-country'] = req.body['train-departure-destination-country'];
  req.session.data['destination-point-train'] = req.body['destination-point-train'];
  req.session.data['departure-railway-bill'] = req.body['departure-railway-bill'];
  req.session.data['departure-train-departure'] = req.body['departure-train-departure'];
  req.session.data['departure-freight-bill'] = req.body['departure-freight-bill'];
  req.session.data['departure-container-identification-train'] = req.body['departure-container-identification-train'];

      // Capture date parts
  const day = req.body['train-departure-date-uk-day'];
  const month = req.body['train-departure-date-uk-month'];
  const year = req.body['train-departure-date-uk-year'];
  const departureDate = `${day}/${month}/${year}`;
  req.session.data['train-departure-date-uk'] = departureDate;

  res.redirect('/zeta/sd/departure-transport-documents-train');
});

router.post('/zeta/sd/departure-transport-container-vessel', function (req, res) {
  req.session.data['container-vessel-departure-destination-country'] = req.body['container-vessel-departure-destination-country'];
  req.session.data['destination-point-vessel'] = req.body['destination-point-vessel'];
  req.session.data['departure-vessel-name'] = req.body['departure-vessel-name'];
  req.session.data['departure-flag-state'] = req.body['departure-flag-state'];
  req.session.data['departure-container-vessel-departure'] = req.body['departure-container-vessel-departure'];
  req.session.data['departure-freight-bill'] = req.body['departure-freight-bill'];

      // Capture date parts
  const day = req.body['container-vessel-departure-date-uk-day'];
  const month = req.body['container-vessel-departure-date-uk-month'];
  const year = req.body['container-vessel-departure-date-uk-year'];
  const departureDate = `${day}/${month}/${year}`;
  req.session.data['container-vessel-departure-date-uk'] = departureDate;

  res.redirect('/zeta/sd/departure-transport-documents-vessel');
});

router.post('/zeta/sd/departure-transport-documents', function (req, res) {
  let documentNames = req.session.data['departure-documentName[]'] || [];
  let referenceNumbers = req.session.data['departure-referenceNumber[]'] || [];

  const names = req.body['documentName[]'] || req.body.documentName;
  const refs = req.body['referenceNumber[]'] || req.body.referenceNumber;
  const editIndex = req.body.editIndex;

  if (editIndex !== undefined && editIndex !== '') {
    documentNames[editIndex] = names;
    referenceNumbers[editIndex] = refs;
  } else {
    if (Array.isArray(names)) {
      documentNames.push(...names);
      referenceNumbers.push(...refs);
    } else {
      documentNames.push(names);
      referenceNumbers.push(refs);
    }
  }

  req.session.data['departure-documentName[]'] = documentNames;
  req.session.data['departure-referenceNumber[]'] = referenceNumbers;

  res.redirect('/zeta/sd/departure-summary');
});

router.post('/zeta/sd/departure-transport-documents-plane', function (req, res) {
  let documentNames = req.session.data['departure-planeDocumentName[]'] || [];
  let referenceNumbers = req.session.data['departure-planeReferenceNumber[]'] || [];

  const names = req.body['documentName[]'] || req.body.documentName;
  const refs = req.body['referenceNumber[]'] || req.body.referenceNumber;
  const editIndex = req.body.editIndex;

  if (editIndex !== undefined && editIndex !== '') {
    documentNames[editIndex] = names;
    referenceNumbers[editIndex] = refs;
  } else {
    if (Array.isArray(names)) {
      documentNames.push(...names);
      referenceNumbers.push(...refs);
    } else {
      documentNames.push(names);
      referenceNumbers.push(refs);
    }
  }

  req.session.data['departure-planeDocumentName[]'] = documentNames;
  req.session.data['departure-planeReferenceNumber[]'] = referenceNumbers;

  res.redirect('/zeta/sd/departure-summary');
});

router.post('/zeta/sd/departure-transport-documents-train', function (req, res) {
  let documentNames = req.session.data['departure-trainDocumentName[]'] || [];
  let referenceNumbers = req.session.data['departure-trainReferenceNumber[]'] || [];

  const names = req.body['documentName[]'] || req.body.documentName;
  const refs = req.body['referenceNumber[]'] || req.body.referenceNumber;
  const editIndex = req.body.editIndex;

  if (editIndex !== undefined && editIndex !== '') {
    documentNames[editIndex] = names;
    referenceNumbers[editIndex] = refs;
  } else {
    if (Array.isArray(names)) {
      documentNames.push(...names);
      referenceNumbers.push(...refs);
    } else {
      documentNames.push(names);
      referenceNumbers.push(refs);
    }
  }

  req.session.data['departure-trainDocumentName[]'] = documentNames;
  req.session.data['departure-trainReferenceNumber[]'] = referenceNumbers;

  res.redirect('/zeta/sd/departure-summary');
});

router.post('/zeta/sd/departure-transport-documents-vessel', function (req, res) {
  let documentNames = req.session.data['departure-vesselDocumentName[]'] || [];
  let referenceNumbers = req.session.data['departure-vesselReferenceNumber[]'] || [];

  const names = req.body['documentName[]'] || req.body.documentName;
  const refs = req.body['referenceNumber[]'] || req.body.referenceNumber;
  const editIndex = req.body.editIndex;

  if (editIndex !== undefined && editIndex !== '') {
    documentNames[editIndex] = names;
    referenceNumbers[editIndex] = refs;
  } else {
    if (Array.isArray(names)) {
      documentNames.push(...names);
      referenceNumbers.push(...refs);
    } else {
      documentNames.push(names);
      referenceNumbers.push(refs);
    }
  }

  req.session.data['departure-vesselDocumentName[]'] = documentNames;
  req.session.data['departure-vesselReferenceNumber[]'] = referenceNumbers;

  res.redirect('/zeta/sd/departure-summary');
});


router.get('/zeta/sd/progress', function (req, res) {
  res.render('zeta/sd/progress.html', {
    data: req.session.data
  });
});

// Route for departure summary
router.post('/zeta/sd/departure-summary', function (req, res) {
  const productEntries = req.session.data['sdProductEntries'];

  if (productEntries && Array.isArray(productEntries)) {
    productEntries.forEach((entry, index) => {
      const netWeightKey = `departure-net-weight-${index}`;
      const fishWeightKey = `departure-fish-weight-${index}`;

      entry.departureNetWeight = req.body[netWeightKey];
      entry.departureFishWeight = req.body[fishWeightKey];
    });
  }

  res.redirect('/zeta/sd/progress');
});

router.post('/zeta/sd/progress', function (req, res) {
  // Handle the progress form submission
  const action = req.body._action || req.body.formaction;

  if (action === 'progress') {
    // Redirect to the next step in the journey
    res.redirect('/zeta/sd/check-your-answers');
  } else {
    // Redirect to the previous step or stay on the same page
    res.redirect('/zeta/sd/progress');
  }
});

// Route for handling the 'Your reference' page
router.post('/zeta/ps/your-reference', function (req, res) {
  req.session.data['your-reference'] = req.body['your-reference'];
  // Add more fields as needed

  // Redirect based on which button was pressed
  if (req.body._action === 'progress' || req.body['formaction'] === 'progress') {
    res.redirect('/zeta/ps/progress');
  } else {
    res.redirect('/zeta/ps/exporter-details');
  }
});

// Route for exporter details
router.post('/zeta/ps/exporter-details', function (req, res) {
  req.session.data['company-name'] = req.body['company-name']
  // Add more fields as needed
  res.redirect('/zeta/ps/product-description')
})

// GET route for product description
router.get('/zeta/ps/product-description', function (req, res) {
  res.render('zeta/ps/product-description', {
    data: req.session.data || {},
    removeMode: req.session.data['removeMode'] || false,
    removeIndex: req.session.data['removeIndex']
  });
});

// Route for product description
router.post('/zeta/ps/product-description', function (req, res) {
  if (!req.session.data['productEntries']) {
    req.session.data['productEntries'] = [];
  }

  const editIndex = req.session.data['editIndex'];

  if (typeof editIndex !== 'undefined') {
    // When editing: merge new description/commodity-code with existing entry data
    const existingEntry = req.session.data['productEntries'][editIndex];
    req.session.data['productEntries'][editIndex] = {
      ...existingEntry,
      commodityCode: req.body['commodity-code'],
      description: req.body['description'],
      isPartial: existingEntry.isPartial // preserve isPartial status
    };
  } else {
    // When adding new: create partial entry with just description and commodity code
    const newEntry = {
      commodityCode: req.body['commodity-code'],
      description: req.body['description'],
      isPartial: true // flag to indicate it's awaiting details
    };
    req.session.data['productEntries'].push(newEntry);
    // Set editIndex to the newly created entry so product-details knows to update it
    req.session.data['editIndex'] = req.session.data['productEntries'].length - 1;
  }

  req.session.data['description'] = req.body['description'];
  req.session.data['commodity-code'] = req.body['commodity-code'];

  res.redirect('/zeta/ps/product-details');
});

// GET route for product details page
router.get('/zeta/ps/product-details', function (req, res) {
  res.render('zeta/ps/product-details', {
    data: req.session.data || {}
  });
  // Clear errors after displaying them so they don't persist on next visit
  delete req.session.data['formErrors'];
});

// Route for product details
router.post('/zeta/ps/product-details', function (req, res) {
  const action = req.body.action;

  const newDetails = {
    ukDocument: req.body['uk-document'],
    issuingCountry: req.body['issuing-country'],
    species: req.body['species'],
    productReferenceNumber: req.body['productReferenceNumber'],
    'catch-certificate-code': req.body['catch-certificate-code'],
    'catch-certificate-weight': req.body['catch-certificate-weight'],
    'net-weight': req.body['net-weight'],
    'fish-weight': req.body['fish-weight'],
    isPartial: false,
    description: req.session.data['description'],
    commodityCode: req.session.data['commodity-code']
  };

  // Only validate when "Add" button is clicked, not when "Save and continue" is clicked
  if (action === 'add') {
    const errors = [];

    if (!req.body['catch-certificate-weight'] || req.body['catch-certificate-weight'] === '') {
      errors.push({
        fieldName: 'catch-certificate-weight',
        message: 'Enter the total weight landed in kg'
      });
    }

    if (!req.body['net-weight'] || req.body['net-weight'] === '') {
      errors.push({
        fieldName: 'net-weight',
        message: 'Enter the export weight in kg (before processing)'
      });
    }

    if (!req.body['fish-weight'] || req.body['fish-weight'] === '') {
      errors.push({
        fieldName: 'fish-weight',
        message: 'Enter the export weight in kg (after processing)'
      });
    }

    // Check weight logic: net-weight (before processing) should be ≤ catch-certificate-weight
    if (req.body['net-weight'] && req.body['catch-certificate-weight']) {
      if (parseFloat(req.body['net-weight']) > parseFloat(req.body['catch-certificate-weight'])) {
        errors.push({
          fieldName: 'net-weight',
          message: 'Export weight before processing must be the same or less than the total weight shown on catch certificate in kg'
        });
      }
    }

    // Check weight logic: fish-weight (after processing) should not exceed net-weight (before processing)
    if (req.body['fish-weight'] && req.body['net-weight']) {
      if (parseFloat(req.body['fish-weight']) > parseFloat(req.body['net-weight'])) {
        errors.push({
          fieldName: 'fish-weight',
          message: 'The weight after processing cannot be higher than before processing'
        });
      }
    }

    // If there are errors, store them and re-render the form
    if (errors.length > 0) {
      req.session.data['formErrors'] = errors;
      return res.redirect('/zeta/ps/product-details');
    }
  }

  // Clear any previous errors
  delete req.session.data['formErrors'];

  // ✅ Validate required fields before saving
  const hasRequiredFields =
    newDetails.species &&
    newDetails.productReferenceNumber &&
    newDetails['net-weight'] &&
    newDetails['fish-weight'] &&
    newDetails['catch-certificate-weight'];

  if (!req.session.data['productEntries']) {
    req.session.data['productEntries'] = [];
  }

  if (hasRequiredFields) {
    const editIndex = req.session.data['editIndex'];
    if (typeof editIndex !== 'undefined') {
      // Update existing entry and mark as complete
      newDetails.isPartial = false;
      req.session.data['productEntries'][editIndex] = newDetails;
      delete req.session.data['editIndex'];
    } else {
      // Add new entry
      newDetails.isPartial = false;
      req.session.data['productEntries'].push(newDetails);
    }
  }

  // ✅ Store species in session for pre-filling
  req.session.data['species'] = req.body['species'];

  if (action === 'add') {
    res.redirect('/zeta/ps/product-details#species-table-container');
  } else if (action === 'continue') {
    // Clear editIndex when moving to next page
    delete req.session.data['editIndex'];
    res.redirect('/zeta/ps/updated-product-summary');
  }
});

// Route for product summary search and pagination
router.get('/zeta/ps/product-summary', function (req, res) {

  const searchQuery = (req.query.s || '').toLowerCase();
  const page = parseInt(req.query.page) || 1;
  const perPage = 10;

  let productEntries = req.session.data['productEntries'] || [];

// Filter
if (searchQuery) {
  productEntries = productEntries.filter(entry =>
    (entry.description ?? '').toString().toLowerCase().includes(searchQuery) ||
    (entry.species ?? '').toString().toLowerCase().includes(searchQuery) ||
    (entry.commodityCode ?? '').toString().toLowerCase().includes(searchQuery) ||
    (
      Array.isArray(entry.productReferenceNumber)
        ? entry.productReferenceNumber.some(ref =>
            ref.toLowerCase().includes(searchQuery)
          )
        : (entry.productReferenceNumber ?? '').toString().toLowerCase().includes(searchQuery)
    )
  );
}



  // Paginate
  const totalPages = Math.ceil(productEntries.length / perPage);
  const paginatedEntries = productEntries.slice((page - 1) * perPage, page * perPage);

  res.render('zeta/ps/product-summary', {
    data: {
      productEntries: paginatedEntries,
      description: req.session.data['description']
    },
    currentPage: page,
    totalPages,
    searchQuery
  });
});

router.get('/zeta/ps/edit-product/:index', function (req, res) {
  const index = parseInt(req.params.index);
  const product = req.session.data['productEntries'][index];

  // Pre-fill session fields with selected product
  req.session.data['uk-document'] = product.ukDocument;
  req.session.data['productReferenceNumber'] = product.productReferenceNumber;
  req.session.data['species'] = product.species;
  req.session.data['commodity-code'] = product.commodityCode;
  req.session.data['description'] = product.description;
  req.session.data['net-weight'] = product.netWeight;
  req.session.data['fish-weight'] = product.fishWeight;
  req.session.data['catch-certificate-weight'] = product['catch-certificate-weight'];

  // Store index for update later
  req.session.data['editIndex'] = index;

  res.redirect('/zeta/ps/product-description');
});

// Route for remove product (similar to edit, but with removeMode flag)
router.get('/zeta/ps/remove-product/:index', function (req, res) {
  const index = parseInt(req.params.index);
  const product = req.session.data['productEntries'][index];

  if (!product) {
    return res.redirect('/zeta/ps/product-summary');
  }

  // Pre-fill session fields with selected product
  req.session.data['species'] = product.species;
  req.session.data['commodity-code'] = product.commodityCode;
  req.session.data['description'] = product.description;
  req.session.data['net-weight'] = product.netWeight;
  req.session.data['fish-weight'] = product.fishWeight;
  req.session.data['catch-certificate-weight'] = product['catch-certificate-weight'];
  req.session.data['productReferenceNumber'] = product.productReferenceNumber;

  // Set flags for removal flow
  req.session.data['removeMode'] = true;
  req.session.data['removeIndex'] = index;

  res.redirect('/zeta/ps/product-description');
});

// Route for direct product removal from product-details (no confirmation)
router.get('/zeta/ps/remove-product-directly/:index', function (req, res) {
  const index = parseInt(req.params.index);

  // Direct removal without confirmation
  if (req.session.data['productEntries'] && req.session.data['productEntries'][index]) {
    req.session.data['productEntries'].splice(index, 1);
  }

  // Clear product fields
  req.session.data['species'] = '';
  req.session.data['commodity-code'] = '';
  req.session.data['description'] = '';
  req.session.data['net-weight'] = '';
  req.session.data['fish-weight'] = '';
  req.session.data['catch-certificate-weight'] = '';
  req.session.data['productReferenceNumber'] = '';

  // Redirect back to product-details
  res.redirect('/zeta/ps/product-details');
});

// Route for confirm remove product (GET)
router.get('/zeta/ps/confirm-remove-product/:index', function (req, res) {
  const index = parseInt(req.params.index);
  const product = req.session.data['productEntries'][index];

  if (!product) {
    return res.redirect('/zeta/ps/product-summary');
  }

  res.render('zeta/ps/confirm-remove-product', {
    data: {
      description: product.description
    },
    productIndex: index
  });
});

// Route for confirm remove product (POST)
router.post('/zeta/ps/confirm-remove-product/:index', function (req, res) {
  const action = req.body.action;

  if (action === 'yes') {
    // Remove ALL entries with the matching description
    const descriptionToRemove = req.session.data['description'];

    if (descriptionToRemove && req.session.data['productEntries']) {
      // Filter out all entries with matching description
      req.session.data['productEntries'] = req.session.data['productEntries'].filter(entry =>
        entry.description !== descriptionToRemove
      );
    }

    // Clear removal flags
    delete req.session.data['removeMode'];
    delete req.session.data['removeIndex'];

    // Clear product fields
    req.session.data['species'] = '';
    req.session.data['commodity-code'] = '';
    req.session.data['description'] = '';
    req.session.data['net-weight'] = '';
    req.session.data['fish-weight'] = '';
    req.session.data['catch-certificate-weight'] = '';
    req.session.data['productReferenceNumber'] = '';

    // Check if there are any products left
    const remainingProducts = (req.session.data['productEntries'] || []).filter(entry =>
      !entry.isPartial && entry.species
    );

    if (remainingProducts.length > 1) {
      // Multiple products remain - show summary
      res.redirect('/zeta/ps/product-summary');
    } else {
      // One or no products left - go back to description to add/edit more
      res.redirect('/zeta/ps/product-description');
    }
  } else {
    // No - clear removal flags but keep product data and go back to product-description
    delete req.session.data['removeMode'];
    delete req.session.data['removeIndex'];
    res.redirect('/zeta/ps/product-description');
  }
});

// Route for product summary
router.post('/zeta/ps/product-summary', function (req, res) {
  req.session.data['more-products'] = req.body['more-products'];

  const productEntries = req.body['more-products'];

  if (productEntries === 'Yes') {
    // ✅ Clear single-entry fields to prevent carry-over
    req.session.data['uk-document'] = '';
    req.session.data['productReferenceNumber'] = '';
    req.session.data['species'] = '';
    req.session.data['commodity-code'] = '';
    req.session.data['description'] = '';
    req.session.data['net-weight'] = '';
    req.session.data['fish-weight'] = '';
    req.session.data['catch-certificate-weight'] = '';

    // ✅ Clear edit index to ensure new entry is created
    delete req.session.data['editIndex'];

    // ❌ Do NOT clear productEntries — keep previous products
    // req.session.data['productEntries'] = []; ← removed

    res.redirect('/zeta/ps/product-description'); // stays in PS flow
  } else if (productEntries === 'No') {
    res.redirect('/zeta/ps/api-processing');
} else {
  // Render the summary page directly if no selection
  res.render('zeta/ps/product-summary', {
    data: {
      productEntries: req.session.data['productEntries'],
      description: req.session.data['description']
    },
    currentPage: 1,
    totalPages: Math.ceil((req.session.data['productEntries'] || []).length / 10),
    searchQuery: ''
  });
}

});

// Route for updated-product-summary
router.get('/zeta/ps/updated-product-summary', function (req, res) {
  const searchQuery = (req.query.s || '').toLowerCase();
  const page = parseInt(req.query.page) || 1;
  const perPage = 10;

  const allProductEntries = req.session.data['productEntries'] || [];

  // Filter out partial or incomplete entries
  let filteredEntries = allProductEntries.filter(entry =>
    !entry.isPartial && entry.species
  );

  // Apply search filter
  if (searchQuery) {
    filteredEntries = filteredEntries.filter(entry =>
      (entry.description ?? '').toLowerCase().includes(searchQuery) ||
      (entry.species ?? '').toLowerCase().includes(searchQuery) ||
      (entry.commodityCode ?? '').toLowerCase().includes(searchQuery) ||
      (
        Array.isArray(entry.productReferenceNumber)
          ? entry.productReferenceNumber.some(ref =>
              ref.toLowerCase().includes(searchQuery)
            )
          : (entry.productReferenceNumber ?? '').toLowerCase().includes(searchQuery)
      )
    );
  }

  // Paginate after filtering
  const totalPages = Math.ceil(filteredEntries.length / perPage);
  const paginatedEntries = filteredEntries.slice((page - 1) * perPage, page * perPage);

  res.render('zeta/ps/updated-product-summary', {
    data: {
      productEntries: paginatedEntries,       // filtered + paginated
      allProductEntries: allProductEntries    // full list for counting
    },
    currentPage: page,
    totalPages,
    searchQuery
  });
});

//Route for updated-product-summary
router.post('/zeta/ps/updated-product-summary', function (req, res) {
  const moreProducts = req.body['more-products'];
  req.session.data['more-products'] = moreProducts;

  if (moreProducts === 'Yes') {
    // Clear single-entry fields
    req.session.data['uk-document'] = '';
    req.session.data['productReferenceNumber'] = '';
    req.session.data['species'] = '';
    req.session.data['commodity-code'] = '';
    req.session.data['description'] = '';
    req.session.data['net-weight'] = '';
    req.session.data['fish-weight'] = '';
    req.session.data['catch-certificate-weight'] = '';
    delete req.session.data['editIndex'];

    res.redirect('/zeta/ps/product-description');
  } else if (moreProducts === 'No') {
    res.redirect('/zeta/ps/api-processing');
  } else {
    // No selection made — redirect to GET route
    res.redirect('/zeta/ps/updated-product-summary');
  }
});



// Route for storage facility details
router.post('/zeta/ps/plant-details', function (req, res) {
  if (req.body['plant-name']) req.session.data['plant-name'] = req.body['plant-name'];
  if (req.body['person-name']) req.session.data['person-name'] = req.body['person-name'];
  req.session.data['approval-number'] = req.body['approval-number'] ||
    (req.session.data['plant-api-selected'] ? req.session.data['plant-api-approval-number'] : '') || '';
  // Add more fields as needed
  res.redirect(req.session.data['plant-api-selected'] ? '/zeta/ps/health-certificate' : '/zeta/ps/plant-address');
});

// API processing plant lookup (start of the processing plant journey)
router.get('/zeta/ps/api-processing', function (req, res) {
  const formErrors = req.session.data.formErrors;

  if (!formErrors) {
    delete req.session.data['api-processing-search'];
    delete req.session.data['api-plant-name'];
    delete req.session.data['plant-name'];
    delete req.session.data['approval-number'];
    delete req.session.data['plant-api-approval-number'];
    delete req.session.data['building-number'];
    delete req.session.data['building-name'];
    delete req.session.data['street-name'];
    delete req.session.data['town-city'];
    delete req.session.data['postcode'];
    delete req.session.data['plant-api-selected'];
  }

  res.render('zeta/ps/api-processing', { data: req.session.data });
  delete req.session.data.formErrors;
});

router.post('/zeta/ps/api-processing', function (req, res) {
  if (!req.body['plant-name']) {
    req.session.data.formErrors = [{
      fieldName: 'plant-search',
      message: 'You must select a processing plant or enter the plant details manually'
    }];
    return res.redirect('/zeta/ps/api-processing');
  }

  req.session.data['api-processing-search'] = req.body['plant-search'];
  req.session.data['api-plant-name'] = req.body['plant-name'];
  req.session.data['plant-name'] = req.body['plant-name'];
  req.session.data['approval-number'] = req.body['plant-approval-number'];
  req.session.data['plant-api-approval-number'] = req.body['plant-approval-number'];
  req.session.data['building-number'] = req.body['plant-building-number'];
  req.session.data['building-name'] = req.body['plant-building-name'];
  req.session.data['street-name'] = req.body['plant-street-name'];
  req.session.data['town-city'] = req.body['plant-town-city'];
  req.session.data['postcode'] = req.body['plant-postcode'];
  req.session.data['plant-api-selected'] = true;
  // API result already includes the address, so continue straight to the plant details
  res.redirect('/zeta/ps/plant-details');
});

// Route for storage facility details
router.post('/zeta/ps/plant-address', function (req, res) {
  const postcode = (req.body['postcode'] || '').trim().toUpperCase().replace(/\s+/g, ' ');
  const ukPostcodePattern = /^(GIR 0AA|[A-Z]{1,2}\d[A-Z\d]?\s?\d[ABD-HJLNP-UW-Z]{2})$/;
  if (!ukPostcodePattern.test(postcode)) {
    req.session.data['postcode'] = req.body['postcode'];
    req.session.data.formErrors = [{ fieldName: 'postcode', message: 'Enter a valid UK postcode' }];
    return res.redirect('/zeta/ps/plant-address');
  }
  req.session.data.formErrors = [];
  delete req.session.data['approval-number'];
  delete req.session.data['plant-api-approval-number'];
  delete req.session.data['plant-api-selected'];
  req.session.data['postcode'] = postcode;
  if (req.body['postcode'] === 'HU1 1AA') {
    req.session.data['building-number'] = '10';
    req.session.data['building-name'] = 'Manual Plant';
    req.session.data['street-name'] = 'Test Street';
    req.session.data['town-city'] = 'Hull';
  }
  // Add more fields as needed
  res.redirect('/zeta/ps/plant-address-2');
});

// Route for storage facility address
router.post('/zeta/ps/plant-address-2', function (req, res) {
  const postcode = (req.body['postcode'] || '').trim().toUpperCase().replace(/\s+/g, ' ');
  const country = (req.body['country'] || '').trim().toLowerCase();
  const ukPostcodePattern = /^(GIR 0AA|[A-Z]{1,2}\d[A-Z\d]?\s?\d[ABD-HJLNP-UW-Z]{2})$/;
  const ukCountries = ['uk', 'u.k.', 'united kingdom', 'gb', 'g.b.'];
  const formErrors = [];

  if (!ukPostcodePattern.test(postcode)) {
    formErrors.push({ fieldName: 'postcode', message: 'Enter a valid UK postcode' });
  }
  if (!ukCountries.includes(country)) {
    formErrors.push({ fieldName: 'country', message: 'Enter UK as the country' });
  }
  if (formErrors.length) {
    req.session.data.formErrors = formErrors;
    return res.redirect('/zeta/ps/plant-address-2');
  }

  req.session.data.formErrors = [];
  req.session.data['building-number'] = req.body['building-number'];
  req.session.data['building-name'] = req.body['building-name'];
  req.session.data['sub-building-name'] = req.body['sub-building-name'];
  req.session.data['street-name'] = req.body['street-name'];
  req.session.data['town-city'] = req.body['town-city'];
  req.session.data['county'] = req.body['county'];
  req.session.data['postcode'] = postcode;
  req.session.data['country'] = 'United Kingdom';
  // Add more fields as needed
  res.redirect('/zeta/ps/plant-confirmation');
});

// Route for storage facility confirmation
router.post('/zeta/ps/plant-confirmation', function (req, res) {
  
  // Add more fields as needed
  res.redirect('/zeta/ps/health-certificate');

});

// Route for health certificate details
router.post('/zeta/ps/health-certificate', function (req, res) {
  req.session.data['health-certificate'] = req.body['health-certificate'];

    // Combine arrival date
const arrivalDay = req.body['certificate-date-day'];
const arrivalMonth = req.body['certificate-date-month']; // fix typo in HTML
const arrivalYear = req.body['certificate-date-year'];
req.session.data['certificate-date'] = `${arrivalDay}/${arrivalMonth}/${arrivalYear}`;
  // Add more fields as needed
  res.redirect('/zeta/ps/departure-destination');
});

// Route for departure destination
router.post('/zeta/ps/departure-destination', function (req, res) {
  req.session.data['departure-destination-country'] = req.body['departure-destination-country'];
  // Add more fields as needed
  res.redirect('/zeta/ps/progress');
});

router.post('/zeta/ps/progress', function (req, res) {
  // Handle the progress form submission
  const action = req.body._action || req.body.formaction;

  if (action === 'progress') {
    // Redirect to the next step in the journey
    res.redirect('/zeta/ps/check-your-answers');
  } else {
    // Redirect to the previous step or stay on the same page
    res.redirect('/zeta/ps/progress');
  }
});

