
import { db } from './db';
import { eq, and, gte, lte } from 'drizzle-orm';
import { userProfiles, employeeCompensation, salaryComponents, attendance, holidays, reimbursements, payrolls } from '@shared/schema';

interface PayrollCalculation {
  userId: string;
  month: number;
  year: number;
  basicSalary: number;
  allowances: number;
  deductions: number;
  reimbursements: number;
  grossSalary: number;
  pfDeduction: number;
  incomeTax: number;
  totalDeductions: number;
  netSalary: number;
  lopDays: number;
  lopAmount: number;
  workingDays: number;
  presentDays: number;
  leaveDays: number;
  absentDays: number;
  weeklyOffs: number;
  holidays: number;
}

export class PayrollCalculator {
  // PF rate: 12% of basic salary (employee contribution)
  private static readonly PF_RATE = 0.12;
  
  // Income tax slabs (new regime FY 2024-25)
  private static readonly TAX_SLABS = [
    { min: 0, max: 300000, rate: 0 },
    { min: 300000, max: 700000, rate: 0.05 },
    { min: 700000, max: 1000000, rate: 0.10 },
    { min: 1000000, max: 1200000, rate: 0.15 },
    { min: 1200000, max: 1500000, rate: 0.20 },
    { min: 1500000, max: Infinity, rate: 0.30 }
  ];

  /**
   * Calculate payroll for an employee for a given month
   */
  static async calculatePayroll(userId: string, month: number, year: number): Promise<PayrollCalculation> {
    // Get employee compensation
    const compensation = await this.getEmployeeCompensation(userId);
    
    // Calculate calendar days in month
    const daysInMonth = new Date(year, month, 0).getDate();
    
    // Get attendance data
    const attendanceData = await this.getAttendanceData(userId, month, year);
    
    // Get holidays and weekly offs
    const { holidayCount, weeklyOffCount } = await this.getHolidaysAndWeeklyOffs(month, year);
    
    // Calculate working days (total days - holidays - weekly offs)
    const workingDays = daysInMonth - holidayCount - weeklyOffCount;
    
    // Calculate present, leave, and absent days
    const { presentDays, leaveDays, absentDays } = this.calculateAttendanceDays(attendanceData, workingDays);
    
    // Calculate LOP (Loss of Pay)
    const lopDays = absentDays;
    const perDaySalary = compensation.basicSalary / workingDays;
    const lopAmount = lopDays * perDaySalary;
    
    // Get approved reimbursements for the month
    const approvedReimbursements = await this.getApprovedReimbursements(userId, month, year);
    
    // Calculate gross salary (basic + allowances - deductions)
    const grossSalary = compensation.basicSalary + compensation.allowances - compensation.deductions;
    
    // Calculate PF deduction
    const pfDeduction = compensation.basicSalary * this.PF_RATE;
    
    // Calculate annual gross salary for tax calculation
    const annualGross = grossSalary * 12;
    const monthlyIncomeTax = this.calculateIncomeTax(annualGross) / 12;
    
    // Calculate total deductions
    const totalDeductions = compensation.deductions + pfDeduction + monthlyIncomeTax + lopAmount;
    
    // Calculate net salary
    const netSalary = grossSalary - totalDeductions + approvedReimbursements;
    
    return {
      userId,
      month,
      year,
      basicSalary: compensation.basicSalary,
      allowances: compensation.allowances,
      deductions: compensation.deductions,
      reimbursements: approvedReimbursements,
      grossSalary,
      pfDeduction,
      incomeTax: monthlyIncomeTax,
      totalDeductions,
      netSalary: Math.max(0, netSalary), // Ensure net salary is not negative
      lopDays,
      lopAmount,
      workingDays,
      presentDays,
      leaveDays,
      absentDays,
      weeklyOffs: weeklyOffCount,
      holidays: holidayCount
    };
  }

  /**
   * Get employee compensation breakdown
   */
  private static async getEmployeeCompensation(userId: string): Promise<{
    basicSalary: number;
    allowances: number;
    deductions: number;
  }> {
    const compensationRecords = await db
      .select()
      .from(employeeCompensation)
      .innerJoin(salaryComponents, eq(employeeCompensation.componentId, salaryComponents.id))
      .where(
        and(
          eq(employeeCompensation.userId, userId),
          eq(employeeCompensation.isActive, true)
        )
      );

    let basicSalary = 0;
    let allowances = 0;
    let deductions = 0;

    for (const record of compensationRecords) {
      const amount = parseFloat(record.employee_compensation.amount);
      const component = record.salary_components;
      
      if (component.name.toLowerCase().includes('basic')) {
        basicSalary += amount;
      } else if (component.type === 'Earning') {
        allowances += amount;
      } else if (component.type === 'Deduction') {
        deductions += amount;
      }
    }

    // If no basic salary found, use a default or throw error
    if (basicSalary === 0) {
      throw new Error('No basic salary component found for employee');
    }

    return { basicSalary, allowances, deductions };
  }

  /**
   * Get attendance records for the month
   */
  private static async getAttendanceData(userId: string, month: number, year: number) {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = `${year}-${String(month).padStart(2, '0')}-${new Date(year, month, 0).getDate()}`;

    return await db
      .select()
      .from(attendance)
      .where(
        and(
          eq(attendance.userId, userId),
          gte(attendance.attendanceDate, startDate),
          lte(attendance.attendanceDate, endDate)
        )
      );
  }

  /**
   * Calculate present, leave, and absent days
   */
  private static calculateAttendanceDays(attendanceRecords: any[], workingDays: number) {
    let presentDays = 0;
    let leaveDays = 0;
    let absentDays = 0;

    for (const record of attendanceRecords) {
      if (record.status === 'Present') {
        presentDays += 1;
      } else if (record.status === 'On Leave') {
        leaveDays += 1;
      } else if (record.status === 'Absent') {
        absentDays += 1;
      }
    }

    // Calculate unmarked days as absent
    const markedDays = presentDays + leaveDays + absentDays;
    const unmarkedDays = Math.max(0, workingDays - markedDays);
    absentDays += unmarkedDays;

    return { presentDays, leaveDays, absentDays };
  }

  /**
   * Get holidays and weekly offs count for the month
   */
  private static async getHolidaysAndWeeklyOffs(month: number, year: number): Promise<{
    holidayCount: number;
    weeklyOffCount: number;
  }> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    // Get holidays
    const holidayRecords = await db
      .select()
      .from(holidays)
      .where(
        and(
          lte(holidays.fromDate, endDate.toISOString().split('T')[0]),
          gte(holidays.toDate, startDate.toISOString().split('T')[0])
        )
      );

    let holidayCount = 0;
    for (const holiday of holidayRecords) {
      const from = new Date(holiday.fromDate);
      const to = new Date(holiday.toDate);
      
      // Count only days within the month
      const effectiveFrom = from < startDate ? startDate : from;
      const effectiveTo = to > endDate ? endDate : to;
      
      const days = Math.ceil((effectiveTo.getTime() - effectiveFrom.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      holidayCount += days;
    }

    // Calculate weekly offs (Sundays)
    let weeklyOffCount = 0;
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      if (currentDate.getDay() === 0) { // Sunday
        weeklyOffCount++;
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return { holidayCount, weeklyOffCount };
  }

  /**
   * Get approved reimbursements for the month
   */
  private static async getApprovedReimbursements(userId: string, month: number, year: number): Promise<number> {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = `${year}-${String(month).padStart(2, '0')}-${new Date(year, month, 0).getDate()}`;

    const approvedReimb = await db
      .select()
      .from(reimbursements)
      .where(
        and(
          eq(reimbursements.userId, userId),
          eq(reimbursements.status, 'Approved by Accountant'),
          gte(reimbursements.date, startDate),
          lte(reimbursements.date, endDate)
        )
      );

    return approvedReimb.reduce((sum, reimb) => sum + parseFloat(reimb.amount), 0);
  }

  /**
   * Calculate annual income tax based on new tax regime
   */
  private static calculateIncomeTax(annualIncome: number): number {
    let tax = 0;
    let remainingIncome = annualIncome;

    for (const slab of this.TAX_SLABS) {
      if (remainingIncome <= 0) break;

      const taxableInThisSlab = Math.min(
        remainingIncome,
        slab.max - slab.min
      );

      tax += taxableInThisSlab * slab.rate;
      remainingIncome -= taxableInThisSlab;
    }

    // Add 4% cess on total tax
    tax = tax * 1.04;

    return Math.round(tax);
  }

  /**
   * Generate payroll for an employee
   */
  static async generatePayroll(userId: string, month: number, year: number) {
    // Check if payroll already exists
    const existing = await db
      .select()
      .from(payrolls)
      .where(
        and(
          eq(payrolls.userId, userId),
          eq(payrolls.month, month),
          eq(payrolls.year, year)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      throw new Error('Payroll already exists for this month');
    }

    const calculation = await this.calculatePayroll(userId, month, year);

    const [newPayroll] = await db.insert(payrolls).values({
      userId: calculation.userId,
      month: calculation.month,
      year: calculation.year,
      basicSalary: calculation.basicSalary.toString(),
      allowances: calculation.allowances.toString(),
      deductions: calculation.deductions.toString(),
      reimbursements: calculation.reimbursements.toString(),
      grossSalary: calculation.grossSalary.toString(),
      pfDeduction: calculation.pfDeduction.toString(),
      incomeTax: calculation.incomeTax.toString(),
      totalDeductions: calculation.totalDeductions.toString(),
      netSalary: calculation.netSalary.toString(),
      lopDays: calculation.lopDays.toString(),
      lopAmount: calculation.lopAmount.toString(),
      workingDays: calculation.workingDays,
      presentDays: calculation.presentDays.toString(),
      leaveDays: calculation.leaveDays.toString(),
      absentDays: calculation.absentDays.toString(),
      weeklyOffs: calculation.weeklyOffs,
      holidays: calculation.holidays,
      status: 'Draft'
    }).returning();

    return newPayroll;
  }
}
