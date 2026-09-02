// src/services/studentTuitionService.js
// Deprecated — logic đã chuyển sang tuitionService.getStudentTuitionByYear
// Giữ lại để backward compatibility
export const studentTuitionService = {
  async getStudentTuition(studentId) {
    const { tuitionService } = await import('./tuitionService');
    return tuitionService.getStudentTuitionByYear(studentId);
  },
};