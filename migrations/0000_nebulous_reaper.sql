CREATE TABLE "attendance" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"attendance_date" date NOT NULL,
	"status" text NOT NULL,
	"leave_type_id" varchar,
	"company_id" varchar,
	"check_in" timestamp,
	"check_out" timestamp,
	"early_sign_in" boolean DEFAULT false,
	"early_sign_out" boolean DEFAULT false,
	"late_sign_in" boolean DEFAULT false,
	"late_sign_out" boolean DEFAULT false,
	"shift_timing" text,
	"total_duration" numeric,
	"regularization_requested" boolean DEFAULT false,
	"regularization_reason" text,
	"regularization_status" text,
	"regularization_approved_by" varchar,
	"regularization_approved_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "companies" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"cost_center" text,
	"country" text,
	"date_of_establishment" date
);
--> statement-breakpoint
CREATE TABLE "cost_centers" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text
);
--> statement-breakpoint
CREATE TABLE "departments" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	CONSTRAINT "departments_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "employee_compensation" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"component_id" varchar NOT NULL,
	"amount" numeric NOT NULL,
	"effective_from" date NOT NULL,
	"effective_to" date,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "holiday_details" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"holiday_id" varchar NOT NULL,
	"date" date NOT NULL,
	"description" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "holidays" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"company_id" varchar,
	"from_date" date NOT NULL,
	"to_date" date NOT NULL,
	"total_holidays" integer NOT NULL,
	"type" varchar DEFAULT 'National' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leave_ledgers" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"leave_type_id" varchar NOT NULL,
	"total_leaves" numeric NOT NULL,
	"used_leaves" numeric DEFAULT '0',
	"year" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leave_types" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"max_consecutive_days" integer,
	"is_carry_forward" boolean DEFAULT false,
	CONSTRAINT "leave_types_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "leaves" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"leave_type_id" varchar NOT NULL,
	"company_id" varchar,
	"from_date" date NOT NULL,
	"to_date" date NOT NULL,
	"half_day" boolean DEFAULT false,
	"reason" text NOT NULL,
	"status" text DEFAULT 'Open' NOT NULL,
	"posting_date" timestamp DEFAULT now(),
	"manager_id" varchar,
	"manager_approval_date" timestamp,
	"manager_comments" text
);
--> statement-breakpoint
CREATE TABLE "payrolls" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"month" integer NOT NULL,
	"year" integer NOT NULL,
	"basic_salary" numeric NOT NULL,
	"allowances" numeric DEFAULT '0',
	"deductions" numeric DEFAULT '0',
	"reimbursements" numeric DEFAULT '0',
	"lop_days" numeric DEFAULT '0',
	"lop_amount" numeric DEFAULT '0',
	"gross_salary" numeric NOT NULL,
	"pf_deduction" numeric DEFAULT '0',
	"income_tax" numeric DEFAULT '0',
	"total_deductions" numeric DEFAULT '0',
	"net_salary" numeric NOT NULL,
	"working_days" integer DEFAULT 0,
	"present_days" numeric DEFAULT '0',
	"leave_days" numeric DEFAULT '0',
	"absent_days" numeric DEFAULT '0',
	"weekly_offs" integer DEFAULT 0,
	"holidays" integer DEFAULT 0,
	"status" text DEFAULT 'Draft' NOT NULL,
	"generated_at" timestamp DEFAULT now(),
	"approved_by" varchar,
	"approved_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "reimbursement_types" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "reimbursement_types_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "reimbursements" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"reimbursement_type_id" varchar NOT NULL,
	"date" date NOT NULL,
	"amount" numeric NOT NULL,
	"category" text NOT NULL,
	"attachment" text,
	"status" text DEFAULT 'Pending' NOT NULL,
	"manager_id" varchar,
	"manager_approval_date" timestamp,
	"manager_comments" text,
	"accountant_id" varchar,
	"accountant_approval_date" timestamp,
	"accountant_comments" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "salary_components" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true,
	CONSTRAINT "salary_components_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "user_profiles" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"role_id" varchar,
	"company_id" varchar,
	"first_name" text NOT NULL,
	"middle_name" text,
	"last_name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"street" text,
	"city" text,
	"state" text,
	"country" text,
	"language" text DEFAULT 'English',
	"timezone" text DEFAULT 'Asia/Kolkata',
	"gender" text,
	"birthdate" date,
	"username" text NOT NULL,
	"password_hash" text NOT NULL,
	"status" text DEFAULT 'Active' NOT NULL,
	"user_type" text,
	"bank_account" text,
	"insurance_opted" boolean DEFAULT false,
	"department_id" varchar,
	"manager_id" varchar,
	"joining_date" date,
	"photo" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "user_profiles_email_unique" UNIQUE("email"),
	CONSTRAINT "user_profiles_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "user_roles" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"role_name" text NOT NULL,
	"role_description" text,
	"access_type" text NOT NULL,
	"access_level" text NOT NULL,
	"level" integer NOT NULL,
	CONSTRAINT "user_roles_role_name_unique" UNIQUE("role_name")
);
--> statement-breakpoint
CREATE TABLE "user_types" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "user_types_name_unique" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_user_id_user_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_leave_type_id_leave_types_id_fk" FOREIGN KEY ("leave_type_id") REFERENCES "public"."leave_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_regularization_approved_by_user_profiles_id_fk" FOREIGN KEY ("regularization_approved_by") REFERENCES "public"."user_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_compensation" ADD CONSTRAINT "employee_compensation_user_id_user_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_compensation" ADD CONSTRAINT "employee_compensation_component_id_salary_components_id_fk" FOREIGN KEY ("component_id") REFERENCES "public"."salary_components"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "holiday_details" ADD CONSTRAINT "holiday_details_holiday_id_holidays_id_fk" FOREIGN KEY ("holiday_id") REFERENCES "public"."holidays"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "holidays" ADD CONSTRAINT "holidays_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_ledgers" ADD CONSTRAINT "leave_ledgers_user_id_user_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_ledgers" ADD CONSTRAINT "leave_ledgers_leave_type_id_leave_types_id_fk" FOREIGN KEY ("leave_type_id") REFERENCES "public"."leave_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leaves" ADD CONSTRAINT "leaves_user_id_user_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leaves" ADD CONSTRAINT "leaves_leave_type_id_leave_types_id_fk" FOREIGN KEY ("leave_type_id") REFERENCES "public"."leave_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leaves" ADD CONSTRAINT "leaves_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leaves" ADD CONSTRAINT "leaves_manager_id_user_profiles_id_fk" FOREIGN KEY ("manager_id") REFERENCES "public"."user_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payrolls" ADD CONSTRAINT "payrolls_user_id_user_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payrolls" ADD CONSTRAINT "payrolls_approved_by_user_profiles_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."user_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reimbursements" ADD CONSTRAINT "reimbursements_user_id_user_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reimbursements" ADD CONSTRAINT "reimbursements_reimbursement_type_id_reimbursement_types_id_fk" FOREIGN KEY ("reimbursement_type_id") REFERENCES "public"."reimbursement_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reimbursements" ADD CONSTRAINT "reimbursements_manager_id_user_profiles_id_fk" FOREIGN KEY ("manager_id") REFERENCES "public"."user_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reimbursements" ADD CONSTRAINT "reimbursements_accountant_id_user_profiles_id_fk" FOREIGN KEY ("accountant_id") REFERENCES "public"."user_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_role_id_user_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."user_roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_manager_id_user_profiles_id_fk" FOREIGN KEY ("manager_id") REFERENCES "public"."user_profiles"("id") ON DELETE no action ON UPDATE no action;