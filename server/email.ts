import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  from: {
    name: string;
    email: string;
  };
}

class EmailService {
  private transporter: Transporter | null = null;
  private config: EmailConfig | null = null;

  constructor() {
    this.initialize();
  }

  private initialize() {
    const host = process.env.SMTP_HOST;
    const port = process.env.SMTP_PORT;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASSWORD;
    const fromEmail = process.env.SMTP_FROM_EMAIL;
    const fromName = process.env.SMTP_FROM_NAME;

    if (!host || !port || !user || !pass || !fromEmail || !fromName) {
      console.warn('Email service not configured. SMTP environment variables missing.');
      return;
    }

    this.config = {
      host,
      port: parseInt(port, 10),
      secure: parseInt(port, 10) === 465,
      auth: {
        user,
        pass,
      },
      from: {
        name: fromName,
        email: fromEmail,
      },
    };

    this.transporter = nodemailer.createTransport({
      host: this.config.host,
      port: this.config.port,
      secure: this.config.secure,
      auth: this.config.auth,
    });

    console.log('Email service initialized successfully');
  }

  async sendEmail(to: string, subject: string, html: string): Promise<boolean> {
    if (!this.transporter || !this.config) {
      console.error('Email service not configured. Cannot send email.');
      return false;
    }

    try {
      const info = await this.transporter.sendMail({
        from: `"${this.config.from.name}" <${this.config.from.email}>`,
        to,
        subject,
        html,
      });

      console.log('Email sent successfully:', info.messageId);
      return true;
    } catch (error) {
      console.error('Failed to send email:', error);
      return false;
    }
  }

  async sendLeaveApplicationNotification(
    employeeName: string,
    managerEmail: string,
    leaveType: string,
    startDate: string,
    endDate: string,
    reason: string
  ): Promise<boolean> {
    const subject = `New Leave Application - ${employeeName}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #F23F00; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">MIDCAI HRMS</h1>
          <p style="color: #F3EDED; margin: 5px 0 0 0;">Unfolding Perpetually</p>
        </div>
        <div style="padding: 30px; background-color: #f9f9f9;">
          <h2 style="color: #100D08; margin-top: 0;">New Leave Application</h2>
          <p>Dear Manager,</p>
          <p><strong>${employeeName}</strong> has submitted a new leave application for your review.</p>
          
          <div style="background-color: white; padding: 20px; border-left: 4px solid #F23F00; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Leave Type:</strong> ${leaveType}</p>
            <p style="margin: 5px 0;"><strong>Start Date:</strong> ${startDate}</p>
            <p style="margin: 5px 0;"><strong>End Date:</strong> ${endDate}</p>
            <p style="margin: 5px 0;"><strong>Reason:</strong> ${reason}</p>
          </div>
          
          <p>Please log in to the HRMS system to review and take action on this application.</p>
          
          <div style="margin-top: 30px; text-align: center;">
            <p style="color: #666; font-size: 12px;">This is an automated notification from MIDCAI HRMS</p>
          </div>
        </div>
      </div>
    `;
    
    return this.sendEmail(managerEmail, subject, html);
  }

  async sendLeaveApprovalNotification(
    employeeEmail: string,
    employeeName: string,
    leaveType: string,
    startDate: string,
    endDate: string,
    status: 'Approved' | 'Rejected',
    managerComments?: string
  ): Promise<boolean> {
    const subject = `Leave Application ${status} - ${leaveType}`;
    const statusColor = status === 'Approved' ? '#22c55e' : '#ef4444';
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #F23F00; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">MIDCAI HRMS</h1>
          <p style="color: #F3EDED; margin: 5px 0 0 0;">Unfolding Perpetually</p>
        </div>
        <div style="padding: 30px; background-color: #f9f9f9;">
          <h2 style="color: #100D08; margin-top: 0;">Leave Application ${status}</h2>
          <p>Dear ${employeeName},</p>
          <p>Your leave application has been <strong style="color: ${statusColor};">${status}</strong>.</p>
          
          <div style="background-color: white; padding: 20px; border-left: 4px solid ${statusColor}; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Leave Type:</strong> ${leaveType}</p>
            <p style="margin: 5px 0;"><strong>Start Date:</strong> ${startDate}</p>
            <p style="margin: 5px 0;"><strong>End Date:</strong> ${endDate}</p>
            <p style="margin: 5px 0;"><strong>Status:</strong> <span style="color: ${statusColor};">${status}</span></p>
            ${managerComments ? `<p style="margin: 15px 0 5px 0;"><strong>Manager Comments:</strong></p><p style="margin: 5px 0;">${managerComments}</p>` : ''}
          </div>
          
          <p>You can view the details in the HRMS system.</p>
          
          <div style="margin-top: 30px; text-align: center;">
            <p style="color: #666; font-size: 12px;">This is an automated notification from MIDCAI HRMS</p>
          </div>
        </div>
      </div>
    `;
    
    return this.sendEmail(employeeEmail, subject, html);
  }

  async sendReimbursementNotification(
    employeeName: string,
    managerEmail: string,
    reimbursementType: string,
    amount: number | string,
    description: string
  ): Promise<boolean> {
    const subject = `New Reimbursement Request - ${employeeName}`;
    const amountNum = typeof amount === 'string' ? parseFloat(amount) : amount;
    const formattedAmount = isNaN(amountNum) ? '0.00' : amountNum.toFixed(2);
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #F23F00; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">MIDCAI HRMS</h1>
          <p style="color: #F3EDED; margin: 5px 0 0 0;">Unfolding Perpetually</p>
        </div>
        <div style="padding: 30px; background-color: #f9f9f9;">
          <h2 style="color: #100D08; margin-top: 0;">New Reimbursement Request</h2>
          <p>Dear Manager,</p>
          <p><strong>${employeeName}</strong> has submitted a new reimbursement request for your review.</p>
          
          <div style="background-color: white; padding: 20px; border-left: 4px solid #F23F00; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Type:</strong> ${reimbursementType}</p>
            <p style="margin: 5px 0;"><strong>Amount:</strong> ₹${formattedAmount}</p>
            <p style="margin: 5px 0;"><strong>Description:</strong> ${description}</p>
          </div>
          
          <p>Please log in to the HRMS system to review and take action on this request.</p>
          
          <div style="margin-top: 30px; text-align: center;">
            <p style="color: #666; font-size: 12px;">This is an automated notification from MIDCAI HRMS</p>
          </div>
        </div>
      </div>
    `;
    
    return this.sendEmail(managerEmail, subject, html);
  }

  async sendReimbursementApprovalNotification(
    employeeEmail: string,
    employeeName: string,
    reimbursementType: string,
    amount: number | string,
    status: 'Manager Approved' | 'Approved' | 'Rejected',
    comments?: string
  ): Promise<boolean> {
    const subject = `Reimbursement Request ${status} - ${reimbursementType}`;
    const statusColor = status === 'Rejected' ? '#ef4444' : '#22c55e';
    const amountNum = typeof amount === 'string' ? parseFloat(amount) : amount;
    const formattedAmount = isNaN(amountNum) ? '0.00' : amountNum.toFixed(2);
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #F23F00; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">MIDCAI HRMS</h1>
          <p style="color: #F3EDED; margin: 5px 0 0 0;">Unfolding Perpetually</p>
        </div>
        <div style="padding: 30px; background-color: #f9f9f9;">
          <h2 style="color: #100D08; margin-top: 0;">Reimbursement Request ${status}</h2>
          <p>Dear ${employeeName},</p>
          <p>Your reimbursement request has been <strong style="color: ${statusColor};">${status}</strong>.</p>
          
          <div style="background-color: white; padding: 20px; border-left: 4px solid ${statusColor}; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Type:</strong> ${reimbursementType}</p>
            <p style="margin: 5px 0;"><strong>Amount:</strong> ₹${formattedAmount}</p>
            <p style="margin: 5px 0;"><strong>Status:</strong> <span style="color: ${statusColor};">${status}</span></p>
            ${comments ? `<p style="margin: 15px 0 5px 0;"><strong>Comments:</strong></p><p style="margin: 5px 0;">${comments}</p>` : ''}
          </div>
          
          ${status === 'Approved' ? '<p><strong>Your reimbursement will be processed in the next payroll cycle.</strong></p>' : ''}
          
          <div style="margin-top: 30px; text-align: center;">
            <p style="color: #666; font-size: 12px;">This is an automated notification from MIDCAI HRMS</p>
          </div>
        </div>
      </div>
    `;
    
    return this.sendEmail(employeeEmail, subject, html);
  }

  async sendAttendanceRegularizationNotification(
    employeeName: string,
    managerEmail: string,
    date: string,
    reason: string
  ): Promise<boolean> {
    const subject = `Attendance Regularization Request - ${employeeName}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #F23F00; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">MIDCAI HRMS</h1>
          <p style="color: #F3EDED; margin: 5px 0 0 0;">Unfolding Perpetually</p>
        </div>
        <div style="padding: 30px; background-color: #f9f9f9;">
          <h2 style="color: #100D08; margin-top: 0;">Attendance Regularization Request</h2>
          <p>Dear Manager,</p>
          <p><strong>${employeeName}</strong> has requested attendance regularization for your review.</p>
          
          <div style="background-color: white; padding: 20px; border-left: 4px solid #F23F00; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Date:</strong> ${date}</p>
            <p style="margin: 5px 0;"><strong>Reason:</strong> ${reason}</p>
          </div>
          
          <p>Please log in to the HRMS system to review and take action on this request.</p>
          
          <div style="margin-top: 30px; text-align: center;">
            <p style="color: #666; font-size: 12px;">This is an automated notification from MIDCAI HRMS</p>
          </div>
        </div>
      </div>
    `;
    
    return this.sendEmail(managerEmail, subject, html);
  }

  async sendPayslipNotification(
    employeeEmail: string,
    employeeName: string,
    month: string,
    year: number,
    netSalary: number | string
  ): Promise<boolean> {
    const subject = `Payslip Available - ${month} ${year}`;
    const salaryNum = typeof netSalary === 'string' ? parseFloat(netSalary) : netSalary;
    const formattedSalary = isNaN(salaryNum) ? '0.00' : salaryNum.toFixed(2);
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #F23F00; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">MIDCAI HRMS</h1>
          <p style="color: #F3EDED; margin: 5px 0 0 0;">Unfolding Perpetually</p>
        </div>
        <div style="padding: 30px; background-color: #f9f9f9;">
          <h2 style="color: #100D08; margin-top: 0;">Your Payslip is Ready</h2>
          <p>Dear ${employeeName},</p>
          <p>Your payslip for <strong>${month} ${year}</strong> is now available in the HRMS system.</p>
          
          <div style="background-color: white; padding: 20px; border-left: 4px solid #22c55e; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Period:</strong> ${month} ${year}</p>
            <p style="margin: 5px 0;"><strong>Net Salary:</strong> ₹${formattedSalary}</p>
          </div>
          
          <p>You can view and download your detailed payslip from the Payroll section in the HRMS system.</p>
          
          <div style="margin-top: 30px; text-align: center;">
            <p style="color: #666; font-size: 12px;">This is an automated notification from MIDCAI HRMS</p>
          </div>
        </div>
      </div>
    `;
    
    return this.sendEmail(employeeEmail, subject, html);
  }
}

export const emailService = new EmailService();
