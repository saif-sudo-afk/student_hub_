import api from './api'

export const authApi = {
  me: () => api.get('/auth/me/'),
  login: payload => api.post('/auth/login/', payload),
  logout: refresh => api.post('/auth/logout/', { refresh }),
  registerStudent: payload => api.post('/auth/register/student/', payload),
  verifyEmail: token => api.get(`/auth/verify-email/${token}/`),
  passwordReset: payload => api.post('/auth/password-reset/', payload),
  passwordResetConfirm: payload => api.post('/auth/password-reset/confirm/', payload),
  passwordChange: payload => api.post('/auth/password-change/', payload),
}

export const adminApi = {
  stats: () => api.get('/admin/dashboard-stats/'),
  users: params => api.get('/admin/users/', { params }),
  user: id => api.get(`/admin/users/${id}/`),
  updateUser: (id, payload) => api.patch(`/admin/users/${id}/`, payload),
  deleteUser: id => api.delete(`/admin/users/${id}/`),
  createProfessor: payload => api.post('/admin/professors/create/', payload),
  studentProfiles: params => api.get('/admin/student-profiles/', { params }),
  studentProfile: id => api.get(`/admin/student-profiles/${id}/`),
  professorActivity: () => api.get('/admin/professor-activity/'),
}

export const pedagogiqueApi = {
  majors: params => api.get('/pedagogique/majors/', { params }),
  createMajor: payload => api.post('/pedagogique/majors/', payload),
  updateMajor: (id, payload) => api.patch(`/pedagogique/majors/${id}/`, payload),
  deleteMajor: id => api.delete(`/pedagogique/majors/${id}/`),
  courses: params => api.get('/pedagogique/courses/', { params }),
  createCourse: payload => api.post('/pedagogique/courses/', payload),
  updateCourse: (id, payload) => api.patch(`/pedagogique/courses/${id}/`, payload),
  deleteCourse: id => api.delete(`/pedagogique/courses/${id}/`),
  semesters: params => api.get('/pedagogique/semesters/', { params }),
  createSemester: payload => api.post('/pedagogique/semesters/', payload),
  updateSemester: (id, payload) => api.patch(`/pedagogique/semesters/${id}/`, payload),
  deleteSemester: id => api.delete(`/pedagogique/semesters/${id}/`),
}

export const academicsApi = {
  events: params => api.get('/academics/calendar/', { params }),
  createEvent: payload => api.post('/academics/calendar/', payload),
  updateEvent: (id, payload) => api.patch(`/academics/calendar/${id}/`, payload),
  deleteEvent: id => api.delete(`/academics/calendar/${id}/`),
}

export const announcementsApi = {
  list: params => api.get('/announcements/', { params }),
  create: payload => api.post('/announcements/', payload),
  update: (id, payload) => api.patch(`/announcements/${id}/`, payload),
  delete: id => api.delete(`/announcements/${id}/`),
  approve: id => api.post(`/announcements/${id}/approve/`),
  reject: (id, reason) => api.post(`/announcements/${id}/reject/`, { reason }),
}

export const assignmentsApi = {
  list: params => api.get('/assignments/', { params }),
  create: (payload, onUploadProgress) => api.post('/assignments/', payload, { onUploadProgress }),
  submit: (id, payload, onUploadProgress) => api.post(`/assignments/${id}/submit/`, payload, { onUploadProgress }),
  review: (id, payload) => api.post(`/assignments/${id}/review/`, payload),
  submissions: id => api.get(`/assignments/${id}/submissions/`),
  nonSubmitters: id => api.get(`/assignments/${id}/non_submitters/`),
  groups: params => api.get('/assignments/groups/', { params }),
  createGroup: payload => api.post('/assignments/groups/', payload),
  submitGroupLink: (id, payload) => api.post(`/assignments/groups/${id}/submit_link/`, payload),
  sendNotice: payload => api.post('/assignments/notices/', payload),
  receivedNotices: () => api.get('/assignments/notices/received/'),
  exportGrades: params => api.get('/assignments/export/grades/', { params, responseType: 'blob' }),
}

export const notificationsApi = {
  list: params => api.get('/notifications/', { params }),
  read: id => api.post(`/notifications/${id}/read/`),
  readAll: () => api.post('/notifications/read-all/'),
}
