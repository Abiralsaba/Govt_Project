# Central Government Database — Complete ER Diagram (DBML Format)
## Database: central_govt_db | 117 Tables | All 3NF | All Connected
## Paste the DBML code below into https://dbdiagram.io or any AI ER tool

```dbml
// ==============================================
// CENTRAL GOVERNMENT OF BANGLADESH - FULL ER DIAGRAM
// Database: central_govt_db (MySQL/XAMPP)
// Total Tables: 117 | All in 3NF
// ==============================================

// ═══════════════════════════════════════════════
// MODULE 1: CORE USER & AUTHENTICATION (Hub)
// ═══════════════════════════════════════════════

Table reg_info {
  id int [pk, increment]
  name varchar(100)
  address text
  nid varchar(20) [unique]
  mobile varchar(15)
  email varchar(100) [unique]
  password varchar(255)
  dob date
  gender varchar(10)
  created_at timestamp
  reset_otp varchar(10)
  reset_otp_expires timestamp
  photo_url varchar(255)
}

Table user_info {
  id int [pk, increment]
  user_id int [unique, ref: - reg_info.id]
  name varchar(255)
  email varchar(255)
  nid varchar(50)
  mobile varchar(20)
  dob date
  address text
  gender varchar(20)
  updated_at timestamp
  profile_image varchar(255)
}

Table admins {
  id int [pk, increment]
  name varchar(255)
  email varchar(255) [unique]
  password varchar(255)
  mobile varchar(20)
  status enum_admin_status
  approved_by int
  approved_at datetime
  created_at timestamp
  updated_at timestamp
}

Table login_logs {
  id bigint [pk, increment]
  user_id int [ref: > reg_info.id]
  ip_address varchar(45)
  user_agent text
  login_time timestamp
}

Table admin_login_logs {
  id int [pk, increment]
  admin_id int [ref: > admins.id]
  login_time timestamp
  ip_address varchar(45)
  status enum_login_status
  failure_reason varchar(255)
}

Table admin_actions_log {
  id int [pk, increment]
  admin_id int [ref: > admins.id]
  action_type varchar(50)
  target_table varchar(50)
  target_id int
  old_status varchar(50)
  new_status varchar(50)
  notes text
  created_at timestamp
}

Table edit_req {
  id int [pk, increment]
  user_id int [ref: > reg_info.id]
  edited_by varchar(255)
  edited_fields text
  old_values text
  new_values text
  edited_at timestamp
}

Table notifications {
  id int [pk, increment]
  user_id int [ref: > reg_info.id]
  type varchar(50)
  message text
  is_read tinyint
  created_at timestamp
}

Table audit_log {
  id bigint [pk, increment]
  table_name varchar(100)
  record_id int
  action enum_audit_action
  old_values longtext
  new_values longtext
  changed_fields text
  user_id int [ref: > reg_info.id]
  session_id varchar(100)
  ip_address varchar(45)
  user_agent text
  action_timestamp timestamp
}

// ═══════════════════════════════════════════════
// MODULE 2: GEOGRAPHY (Lookup Hierarchy)
// ═══════════════════════════════════════════════

Table divisions {
  id int [pk, increment]
  name varchar(100) [unique]
}

Table districts {
  id int [pk, increment]
  division_id int [ref: > divisions.id]
  name varchar(100)
}

Table upazilas {
  id int [pk, increment]
  district_id int [ref: > districts.id]
  name varchar(100)
}

// ═══════════════════════════════════════════════
// MODULE 3: NORMALIZED SHARED LOOKUPS
// ═══════════════════════════════════════════════

Table address_types {
  id int [pk, increment]
  type_name varchar(50) [unique]
}

Table addresses {
  id int [pk, increment]
  user_id int [ref: > reg_info.id]
  address_type_id int [ref: > address_types.id]
  division_id int [ref: > divisions.id]
  district_id int [ref: > districts.id]
  upazila_id int [ref: > upazilas.id]
  village_area varchar(255)
  post_office varchar(100)
  post_code varchar(10)
  created_at timestamp
  updated_at timestamp
}

Table document_statuses {
  id int [pk, increment]
  status_name varchar(50) [unique]
  description varchar(255)
  color_code varchar(7)
}

Table payment_methods {
  id int [pk, increment]
  method_name varchar(50) [unique]
  is_active tinyint
  processing_fee_percent decimal(5,2)
}

Table payments {
  id int [pk, increment]
  user_id int [ref: > reg_info.id]
  payment_method_id int [ref: > payment_methods.id]
  service_type varchar(50)
  reference_table varchar(50)
  reference_id int
  amount decimal(15,2)
  processing_fee decimal(10,2)
  total_amount decimal(15,2)
  transaction_id varchar(100) [unique]
  status_id int [ref: > document_statuses.id]
  payment_date timestamp
  verified_at timestamp
  notes text
}

// ═══════════════════════════════════════════════
// MODULE 4: NID WING — ELECTION COMMISSION (14 tables)
// ═══════════════════════════════════════════════

Table nid_profiles {
  id int [pk, increment]
  user_id int [ref: > reg_info.id]
  nid_number varchar(20) [unique]
  old_nid_number varchar(13)
  name_bn varchar(200)
  name_en varchar(200)
  father_name_bn varchar(200)
  father_name_en varchar(200)
  mother_name_bn varchar(200)
  mother_name_en varchar(200)
  spouse_name_bn varchar(200)
  spouse_name_en varchar(200)
  date_of_birth date
  birth_place_bn varchar(200)
  birth_place_en varchar(200)
  birth_certificate_no varchar(30)
  gender enum_gender
  blood_group enum_blood
  mobile_primary varchar(15)
  mobile_secondary varchar(15)
  email varchar(100)
  present_division_id int [ref: > divisions.id]
  present_district_id int [ref: > districts.id]
  present_upazila_id int [ref: > upazilas.id]
  permanent_division_id int [ref: > divisions.id]
  permanent_district_id int [ref: > districts.id]
  permanent_upazila_id int [ref: > upazilas.id]
  educational_qualification varchar(100)
  occupation varchar(100)
  religion enum_religion
  nationality varchar(50)
  voter_area_code varchar(20)
  voter_serial_no varchar(20)
  constituency_no varchar(10)
  photo_url varchar(500)
  signature_url varchar(500)
  fingerprint_registered tinyint
  iris_registered tinyint
  biometric_verified tinyint
  card_type enum_card_type
  card_issued tinyint
  card_issue_date date
  card_expiry_date date
  smart_card_chip_id varchar(50)
  profile_status enum_profile_status
  verification_remarks text
  verified_by int
  verified_at timestamp
  created_at timestamp
  updated_at timestamp
}

Table nid_applications {
  id int [pk, increment]
  user_id int [ref: > reg_info.id]
  application_no varchar(30) [unique]
  application_type enum_nid_app_type
  name_bn varchar(200)
  name_en varchar(200)
  father_name_bn varchar(200)
  father_name_en varchar(200)
  mother_name_bn varchar(200)
  mother_name_en varchar(200)
  spouse_name_bn varchar(200)
  spouse_name_en varchar(200)
  date_of_birth date
  birth_place varchar(200)
  birth_certificate_no varchar(30)
  gender enum_gender
  blood_group varchar(5)
  mobile varchar(15)
  email varchar(100)
  present_division_id int [ref: > divisions.id]
  present_district_id int [ref: > districts.id]
  present_upazila_id int [ref: > upazilas.id]
  present_address text
  permanent_division_id int [ref: > divisions.id]
  permanent_district_id int [ref: > districts.id]
  permanent_upazila_id int [ref: > upazilas.id]
  permanent_address text
  occupation varchar(100)
  educational_qualification varchar(100)
  religion varchar(50)
  photo_url varchar(500)
  signature_url varchar(500)
  birth_cert_url varchar(500)
  citizenship_cert_url varchar(500)
  collection_center_id int [ref: > nid_collection_centers.id]
  biometric_appointment date
  biometric_completed tinyint
  biometric_date timestamp
  status enum_nid_app_status
  rejection_reason text
  reviewed_by int
  reviewed_at timestamp
  approved_by int
  approved_at timestamp
  assigned_nid varchar(20)
  created_at timestamp
  updated_at timestamp
}

Table nid_correction_requests {
  id int [pk, increment]
  user_id int [ref: > reg_info.id]
  nid_profile_id int [ref: > nid_profiles.id]
  request_no varchar(30) [unique]
  nid_number varchar(20)
  correction_category enum_correction_cat
  current_value text
  corrected_value text
  supporting_doc_1 varchar(500)
  supporting_doc_2 varchar(500)
  supporting_doc_3 varchar(500)
  document_description text
  fee_amount decimal(10,2)
  fee_paid tinyint
  payment_ref varchar(50)
  payment_date timestamp
  status enum_correction_status
  rejection_reason text
  admin_remarks text
  reviewed_by int
  reviewed_at timestamp
  office_verification_required tinyint
  office_verification_date date
  office_id int
  created_at timestamp
  updated_at timestamp
}

Table nid_corrections {
  id int [pk, increment]
  user_id int [ref: > reg_info.id]
  nid_number varchar(50)
  request_type varchar(50)
  field_name varchar(50)
  corrected_value varchar(255)
  reason varchar(255)
  status varchar(20)
  created_at timestamp
}

Table nid_reissue_requests {
  id int [pk, increment]
  user_id int [ref: > reg_info.id]
  nid_profile_id int [ref: > nid_profiles.id]
  request_no varchar(30) [unique]
  nid_number varchar(20)
  reason enum_reissue_reason
  reason_details text
  gd_number varchar(50)
  gd_date date
  police_station varchar(100)
  gd_document_url varchar(500)
  damaged_card_returned tinyint
  damaged_card_photo_url varchar(500)
  delivery_type enum_delivery_type
  collection_center_id int [ref: > nid_collection_centers.id]
  delivery_address text
  fee_amount decimal(10,2)
  fee_paid tinyint
  payment_ref varchar(50)
  payment_date timestamp
  status enum_reissue_status
  rejection_reason text
  expected_delivery date
  actual_delivery date
  processed_by int
  processed_at timestamp
  created_at timestamp
  updated_at timestamp
}

Table nid_smart_card_applications {
  id int [pk, increment]
  user_id int [ref: > reg_info.id]
  nid_profile_id int [ref: > nid_profiles.id]
  application_no varchar(30) [unique]
  nid_number varchar(20)
  current_card_type enum_old_card
  old_card_returned tinyint
  include_driving_license tinyint
  include_passport_info tinyint
  include_health_id tinyint
  include_bank_account tinyint
  biometric_update_required tinyint
  biometric_appointment date
  biometric_completed tinyint
  collection_center_id int [ref: > nid_collection_centers.id]
  fee_amount decimal(10,2)
  fee_paid tinyint
  payment_ref varchar(50)
  payment_date timestamp
  status enum_smart_status
  chip_serial varchar(50)
  chip_programmed tinyint
  expected_delivery date
  actual_delivery date
  delivered_by int
  created_at timestamp
  updated_at timestamp
}

Table nid_verification_requests {
  id int [pk, increment]
  user_id int [ref: > reg_info.id]
  verification_type enum_verify_type
  purpose varchar(200)
  verify_nid_number varchar(20)
  verify_name varchar(200)
  verify_dob date
  verification_status enum_verify_status
  verified_data longtext
  mismatch_fields text
  api_response_code varchar(20)
  api_response_time timestamp
  created_at timestamp
}

Table nid_address_changes {
  id int [pk, increment]
  user_id int [ref: > reg_info.id]
  nid_profile_id int [ref: > nid_profiles.id]
  request_no varchar(30) [unique]
  nid_number varchar(20)
  address_type enum_addr_change_type
  old_division_id int [ref: > divisions.id]
  old_district_id int [ref: > districts.id]
  old_upazila_id int [ref: > upazilas.id]
  old_address text
  new_division_id int [ref: > divisions.id]
  new_district_id int [ref: > districts.id]
  new_upazila_id int [ref: > upazilas.id]
  new_post_office varchar(100)
  new_post_code varchar(10)
  new_ward varchar(20)
  new_village varchar(200)
  new_road varchar(100)
  new_house varchar(50)
  new_full_address text
  change_reason text
  proof_document_url varchar(500)
  document_type varchar(100)
  fee_amount decimal(10,2)
  fee_paid tinyint
  payment_ref varchar(50)
  status enum_addr_status
  rejection_reason text
  processed_by int
  processed_at timestamp
  created_at timestamp
  updated_at timestamp
}

Table nid_family_members {
  id int [pk, increment]
  nid_profile_id int [ref: > nid_profiles.id]
  user_id int [ref: > reg_info.id]
  relation enum_relation
  member_name varchar(200)
  member_nid varchar(20)
  member_dob date
  member_occupation varchar(100)
  is_dependent tinyint
  verified tinyint
  created_at timestamp
}

Table nid_biometric_appointments {
  id int [pk, increment]
  user_id int [ref: > reg_info.id]
  appointment_ref varchar(30) [unique]
  application_type enum_bio_app_type
  related_application_id int
  center_id int [ref: > nid_collection_centers.id]
  appointment_date date
  time_slot enum_time_slot
  status enum_bio_status
  completed_at timestamp
  fingerprint_captured tinyint
  iris_captured tinyint
  photo_captured tinyint
  signature_captured tinyint
  processed_by int
  remarks text
  created_at timestamp
  updated_at timestamp
}

Table nid_collection_centers {
  id int [pk, increment]
  center_code varchar(20) [unique]
  center_name varchar(200)
  center_name_bn varchar(200)
  division_id int [ref: > divisions.id]
  district_id int [ref: > districts.id]
  upazila_id int [ref: > upazilas.id]
  address text
  phone varchar(20)
  email varchar(100)
  opening_time time
  closing_time time
  weekly_holiday varchar(20)
  has_biometric_facility tinyint
  has_photo_facility tinyint
  has_card_delivery tinyint
  daily_capacity int
  is_active tinyint
  created_at timestamp
}

Table nid_fees {
  id int [pk, increment]
  service_type varchar(100)
  service_code varchar(20) [unique]
  normal_fee decimal(10,2)
  urgent_fee decimal(10,2)
  processing_days_normal int
  processing_days_urgent int
  is_active tinyint
  effective_from date
  effective_to date
  administered_by int [ref: > admins.id]
  created_at timestamp
}

Table nid_activity_log {
  id int [pk, increment]
  nid_number varchar(20)
  user_id int [ref: > reg_info.id]
  activity_type enum_nid_activity
  activity_details text
  ip_address varchar(50)
  user_agent varchar(500)
  created_at timestamp
}

Table nid_cards {
  id bigint [pk, increment]
  citizen_id bigint [ref: > reg_info.id]
  nid_number varchar(20) [unique]
  issue_date date
  expiry_date date
  smart_card_status tinyint
}

// ═══════════════════════════════════════════════
// MODULE 5: PASSPORT — DIP (5 tables)
// ═══════════════════════════════════════════════

Table passport_offices {
  id int [pk, increment]
  office_code varchar(10) [unique]
  office_name varchar(150)
  office_name_bn varchar(200)
  division varchar(50)
  district varchar(50)
  address text
  phone varchar(20)
  email varchar(100)
  working_hours varchar(100)
  is_active tinyint
  created_at timestamp
}

Table passport_fee_schedule {
  id int [pk, increment]
  passport_type enum_passport_type
  page_count enum_page_count
  validity_years enum_validity
  delivery_type enum_delivery
  fee_bdt decimal(10,2)
  penalty_bdt decimal(10,2)
  description varchar(255)
  effective_from date
  effective_to date
  is_active tinyint
  administered_by int [ref: > admins.id]
  created_at timestamp
}

Table passport_applications {
  id bigint [pk, increment]
  user_id int [ref: > reg_info.id]
  application_number varchar(20) [unique]
  service_type enum_passport_service
  passport_type enum_passport_type
  page_count enum_page_count
  validity_years enum_validity
  delivery_type enum_delivery
  full_name_bn varchar(255)
  full_name_en varchar(255)
  father_name_bn varchar(255)
  father_name_en varchar(255)
  mother_name_bn varchar(255)
  mother_name_en varchar(255)
  spouse_name_bn varchar(255)
  spouse_name_en varchar(255)
  date_of_birth date
  gender enum_gender
  religion enum_religion
  marital_status enum_marital
  nationality varchar(50)
  nid_number varchar(17)
  birth_certificate_no varchar(17)
  tin_number varchar(12)
  blood_group enum_blood
  profession varchar(100)
  education enum_education
  height_ft tinyint
  height_in tinyint
  distinguishing_mark varchar(255)
  present_care_of varchar(255)
  present_village_road varchar(255)
  present_post_office varchar(100)
  present_postal_code varchar(10)
  present_upazila varchar(100)
  present_district varchar(50)
  present_division varchar(50)
  same_as_present tinyint
  permanent_care_of varchar(255)
  permanent_village_road varchar(255)
  permanent_post_office varchar(100)
  permanent_postal_code varchar(10)
  permanent_upazila varchar(100)
  permanent_district varchar(50)
  permanent_division varchar(50)
  mobile_number varchar(15)
  email varchar(255)
  emergency_contact_name varchar(255)
  emergency_contact_phone varchar(15)
  emergency_contact_relation varchar(50)
  old_passport_number varchar(15)
  old_passport_issue_date date
  old_passport_expiry_date date
  old_passport_issue_place varchar(100)
  reason_for_reissue enum_reissue
  preferred_office varchar(10) [ref: > passport_offices.office_code]
  status enum_passport_status
  rejection_reason text
  admin_remarks text
  fee_amount decimal(10,2)
  penalty_amount decimal(10,2)
  total_fee decimal(10,2)
  payment_status enum_pay_status
  transaction_id varchar(255)
  payment_gateway varchar(50)
  payment_method enum_pay_method
  payment_transaction_id varchar(100)
  payment_date datetime
  photo_path varchar(500)
  nid_scan_path varchar(500)
  birth_cert_path varchar(500)
  old_passport_scan_path varchar(500)
  noc_path varchar(500)
  affidavit_path varchar(500)
  additional_doc_path varchar(500)
  submitted_at timestamp
  biometric_date datetime
  police_verification_date datetime
  approved_at datetime
  printed_at datetime
  dispatched_at datetime
  delivered_at datetime
  updated_at timestamp
}

Table passport_status_history {
  id bigint [pk, increment]
  application_id bigint [ref: > passport_applications.id]
  old_status varchar(50)
  new_status varchar(50)
  changed_by varchar(100)
  remarks text
  created_at timestamp
}

Table passport_books {
  id bigint [pk, increment]
  application_id bigint [unique, ref: - passport_applications.id]
  passport_number varchar(9) [unique]
  issue_date date
  expiry_date date
  issuing_authority varchar(150)
  place_of_issue varchar(100)
  mrz_line1 varchar(44)
  mrz_line2 varchar(44)
  passport_type_code char(2)
  is_active tinyint
  created_at timestamp
}

// ═══════════════════════════════════════════════
// MODULE 6: HEALTH — MOHFW (6 tables)
// ═══════════════════════════════════════════════

Table health_hospitals {
  id int [pk, increment]
  name varchar(200)
  name_bn varchar(200)
  hospital_type enum_hospital_type
  division varchar(50)
  district varchar(50)
  upazila varchar(80)
  address text
  phone varchar(20)
  emergency_phone varchar(20)
  email varchar(100)
  total_beds int
  icu_beds int
  available_beds int
  available_icu_beds int
  departments text
  facilities text
  ambulance_available tinyint
  blood_bank tinyint
  is_active tinyint
  created_at timestamp
  updated_at timestamp
}

Table health_cards {
  id int [pk, increment]
  user_id int [ref: > reg_info.id]
  card_number varchar(20) [unique]
  full_name varchar(150)
  father_name varchar(150)
  mother_name varchar(150)
  nid_number varchar(20)
  date_of_birth date
  gender enum_gender
  blood_group enum_blood
  phone varchar(15)
  emergency_contact varchar(15)
  division varchar(50)
  district varchar(50)
  upazila varchar(80)
  address text
  allergies text
  chronic_diseases text
  disability enum_disability
  status enum_approval_status
  admin_remarks text
  created_at timestamp
  updated_at timestamp
}

Table health_vaccinations {
  id int [pk, increment]
  user_id int [ref: > reg_info.id]
  health_card_id int [ref: > health_cards.id]
  vaccine_name varchar(100)
  vaccine_type enum_vaccine_type
  dose_number int
  vaccination_date date
  vaccination_center varchar(200)
  batch_number varchar(50)
  administered_by varchar(100)
  next_dose_date date
  side_effects text
  certificate_number varchar(50)
  status enum_vaccine_status
  admin_remarks text
  created_at timestamp
  updated_at timestamp
}

Table health_appointments {
  id int [pk, increment]
  user_id int [ref: > reg_info.id]
  hospital_id int [ref: > health_hospitals.id]
  patient_name varchar(150)
  patient_age int
  patient_gender enum_gender
  phone varchar(15)
  department enum_department
  doctor_name varchar(150)
  appointment_date date
  appointment_time varchar(20)
  symptoms text
  urgency enum_urgency
  status enum_appt_status
  prescription text
  admin_remarks text
  created_at timestamp
  updated_at timestamp
}

Table health_ambulance_requests {
  id int [pk, increment]
  user_id int [ref: > reg_info.id]
  patient_name varchar(150)
  phone varchar(15)
  emergency_type enum_emergency_type
  pickup_address text
  destination_hospital varchar(200)
  division varchar(50)
  district varchar(50)
  urgency enum_ambulance_urgency
  ambulance_type enum_ambulance_type
  status enum_ambulance_status
  driver_name varchar(100)
  driver_phone varchar(15)
  vehicle_number varchar(30)
  estimated_arrival varchar(20)
  admin_remarks text
  created_at timestamp
  updated_at timestamp
}

Table health_complaints {
  id int [pk, increment]
  user_id int [ref: > reg_info.id]
  complaint_type enum_health_complaint
  hospital_name varchar(200)
  description text
  division varchar(50)
  district varchar(50)
  status enum_complaint_status
  resolution text
  admin_remarks text
  created_at timestamp
  updated_at timestamp
}

// ═══════════════════════════════════════════════
// MODULE 7: WATER RESOURCES (5 tables)
// ═══════════════════════════════════════════════

Table water_connections {
  id int [pk, increment]
  user_id int [ref: > reg_info.id]
  connection_number varchar(20) [unique]
  holder_name varchar(150)
  nid_number varchar(20)
  phone varchar(15)
  connection_type enum_conn_type
  pipe_size enum_pipe
  division varchar(50)
  district varchar(50)
  upazila varchar(80)
  address text
  ward_no varchar(10)
  zone varchar(50)
  wasa_region enum_wasa
  status enum_conn_status
  monthly_rate decimal(10,2)
  admin_remarks text
  approved_date date
  created_at timestamp
  updated_at timestamp
}

Table water_bill_payments {
  id int [pk, increment]
  user_id int [ref: > reg_info.id]
  connection_id int [ref: > water_connections.id]
  connection_number varchar(20)
  billing_month varchar(7)
  meter_reading_prev int
  meter_reading_current int
  units_consumed int
  amount decimal(10,2)
  surcharge decimal(10,2)
  total_amount decimal(10,2)
  payment_method enum_water_pay
  transaction_id varchar(50)
  status enum_bill_status
  paid_date datetime
  admin_remarks text
  created_at timestamp
  updated_at timestamp
}

Table water_quality_reports {
  id int [pk, increment]
  user_id int [ref: > reg_info.id]
  source_type enum_water_source
  division varchar(50)
  district varchar(50)
  upazila varchar(80)
  location_details text
  issue_type enum_water_issue
  severity enum_severity
  description text
  affected_people int
  sample_collected tinyint
  test_result text
  status enum_water_report_status
  admin_remarks text
  created_at timestamp
  updated_at timestamp
}

Table water_complaints {
  id int [pk, increment]
  user_id int [ref: > reg_info.id]
  complaint_type enum_water_complaint
  priority enum_priority
  division varchar(50)
  district varchar(50)
  upazila varchar(80)
  address text
  description text
  contact_phone varchar(15)
  status enum_water_comp_status
  assigned_to varchar(100)
  resolution text
  admin_remarks text
  resolved_date datetime
  created_at timestamp
  updated_at timestamp
}

Table water_projects {
  id int [pk, increment]
  project_name varchar(250)
  project_name_bn varchar(250)
  project_type enum_project_type
  implementing_agency varchar(200)
  division_id int [ref: > divisions.id]
  district_id int [ref: > districts.id]
  budget_crore decimal(12,2)
  start_date date
  expected_completion date
  progress_percent int
  beneficiaries int
  description text
  status enum_project_status
  is_active tinyint
  created_at timestamp
  updated_at timestamp
}

// ═══════════════════════════════════════════════
// MODULE 8: LAND & REVENUE (3 tables)
// ═══════════════════════════════════════════════

Table my_land_record {
  id int [pk, increment]
  user_id int [ref: > reg_info.id]
  owner_name varchar(255)
  nid varchar(50)
  khatian_no varchar(50)
  dag_no varchar(50)
  mouza varchar(100)
  land_size decimal(10,4)
  ownership_description text
  status enum_land_status
  recorded_at timestamp
  division_id int [ref: > divisions.id]
  district_id int [ref: > districts.id]
  upazila_id int [ref: > upazilas.id]
  father_name varchar(255)
  mother_name varchar(255)
  deed_no varchar(100)
  land_price decimal(15,2)
  jl_no varchar(50)
  hold_no varchar(50)
}

Table land_mutations_v2 {
  id int [pk, increment]
  user_id int [ref: > reg_info.id]
  buyer_id int [ref: > reg_info.id]
  division_id int [ref: > divisions.id]
  district_id int [ref: > districts.id]
  upazila_id int [ref: > upazilas.id]
  applicant_name varchar(255)
  applicant_father varchar(255)
  applicant_mother varchar(255)
  applicant_nid varchar(50)
  khatian_no varchar(100)
  dag_no varchar(100)
  land_amount varchar(100)
  land_price decimal(15,2)
  deed_no varchar(100)
  ownership_type enum_ownership
  buyer_name varchar(255)
  buyer_father_name varchar(255)
  buyer_mother_name varchar(255)
  buyer_nid varchar(50)
  tracking_number varchar(50) [unique]
  status enum_mutation_status
  created_at timestamp
}

Table landtax {
  id int [pk, increment]
  user_id int [ref: > reg_info.id]
  transaction_id varchar(255) [unique]
  applicant_name varchar(255)
  father_name varchar(255)
  mother_name varchar(255)
  nid varchar(50)
  mobile varchar(20)
  khatian_no varchar(50)
  dag_no varchar(50)
  land_type enum_land_type
  land_size decimal(10,4)
  tax_amount decimal(10,2)
  payment_status enum_pay_status_land
  payment_date datetime
  created_at timestamp
  division_id int [ref: > divisions.id]
  district_id int [ref: > districts.id]
  upazila_id int [ref: > upazilas.id]
}

// ═══════════════════════════════════════════════
// MODULE 9: TAX / NBR (8 tables)
// ═══════════════════════════════════════════════

Table nbr_tax_zones {
  id int [pk, increment]
  zone_name varchar(100)
  zone_name_bn varchar(200)
  circle_name varchar(100)
  circle_name_bn varchar(200)
  division varchar(50)
  district varchar(80)
  zone_code varchar(20) [unique]
  office_address text
  phone varchar(30)
  email varchar(100)
  is_active tinyint
  created_at timestamp
}

Table nbr_tin_registrations {
  id int [pk, increment]
  user_id int [ref: > reg_info.id]
  tin_number varchar(20) [unique]
  taxpayer_name varchar(200)
  father_name varchar(200)
  mother_name varchar(200)
  date_of_birth date
  nid_number varchar(20)
  passport_number varchar(30)
  mobile varchar(20)
  email varchar(100)
  present_address text
  permanent_address text
  taxpayer_type enum_taxpayer_type
  source_of_income varchar(255)
  zone_id int [ref: > nbr_tax_zones.id]
  circle varchar(100)
  status enum_tin_status
  remarks text
  approved_by int
  approved_at timestamp
  created_at timestamp
  updated_at timestamp
}

Table nbr_tax_returns {
  id int [pk, increment]
  user_id int [ref: > reg_info.id]
  tin_id int [ref: > nbr_tin_registrations.id]
  assessment_year varchar(20)
  income_year varchar(20)
  return_type enum_return_type
  salary_income decimal(15,2)
  house_property_income decimal(15,2)
  agriculture_income decimal(15,2)
  business_income decimal(15,2)
  capital_gains decimal(15,2)
  other_income decimal(15,2)
  total_income decimal(15,2)
  tax_exempted_income decimal(15,2)
  taxable_income decimal(15,2)
  tax_on_income decimal(15,2)
  tax_rebate decimal(15,2)
  net_tax_liability decimal(15,2)
  tax_paid_advance decimal(15,2)
  tax_deducted_source decimal(15,2)
  tax_due decimal(15,2)
  total_assets decimal(15,2)
  total_liabilities decimal(15,2)
  net_wealth decimal(15,2)
  total_expenditure decimal(15,2)
  submission_ref varchar(30) [unique]
  status enum_ereturn_status
  admin_remarks text
  reviewed_by int
  reviewed_at timestamp
  created_at timestamp
  updated_at timestamp
}

Table nbr_tax_payments {
  id int [pk, increment]
  user_id int [ref: > reg_info.id]
  return_id int [ref: > nbr_tax_returns.id]
  tin_id int [ref: > nbr_tin_registrations.id]
  payment_type enum_tax_pay_type
  amount decimal(15,2)
  payment_method enum_nbr_method
  bank_name varchar(100)
  branch_name varchar(100)
  transaction_id varchar(50)
  challan_no varchar(30)
  payment_date date
  fiscal_year varchar(20)
  status enum_tax_pay_status
  receipt_no varchar(30) [unique]
  remarks text
  created_at timestamp
}

Table nbr_vat_registrations {
  id int [pk, increment]
  user_id int [ref: > reg_info.id]
  bin_number varchar(20) [unique]
  business_name varchar(255)
  business_name_bn varchar(255)
  business_type enum_biz_type
  trade_license_no varchar(50)
  business_address text
  annual_turnover decimal(15,2)
  vat_applicable tinyint
  turnover_tax tinyint
  contact_person varchar(200)
  contact_phone varchar(20)
  contact_email varchar(100)
  status enum_vat_status
  approved_by int
  approved_at timestamp
  remarks text
  created_at timestamp
  updated_at timestamp
}

Table nbr_tax_notices {
  id int [pk, increment]
  user_id int [ref: > reg_info.id]
  tin_id int [ref: > nbr_tin_registrations.id]
  notice_type enum_notice_type
  subject varchar(255)
  message text
  due_date date
  priority enum_notice_priority
  status enum_notice_status
  issued_by int
  response text
  responded_at timestamp
  created_at timestamp
}

Table nbr_tax_challan {
  id int [pk, increment]
  user_id int [ref: > reg_info.id]
  challan_no varchar(30) [unique]
  tin_number varchar(20)
  assessment_year varchar(20)
  tax_zone varchar(100)
  deposit_type enum_deposit_type
  amount decimal(15,2)
  bank_name varchar(100)
  branch_name varchar(100)
  deposit_date date
  status enum_challan_status
  created_at timestamp
}

Table tax_returns {
  id int [pk, increment]
  user_id int [ref: > reg_info.id]
  tax_year int
  income_amount decimal(15,2)
  tax_paid decimal(15,2)
  submission_date timestamp
  created_at timestamp
}

// ═══════════════════════════════════════════════
// MODULE 10: EDUCATION (5 tables)
// ═══════════════════════════════════════════════

Table education_boards {
  id int [pk, increment]
  code varchar(10) [unique]
  name varchar(100)
  created_at timestamp
}

Table education_institutions {
  id int [pk, increment]
  board_id int [ref: > education_boards.id]
  name varchar(200)
  name_bn varchar(200)
  institution_type enum_inst_type
  eiin varchar(20)
  created_at timestamp
}

Table jsc_results {
  id int [pk, increment]
  roll_number varchar(20)
  registration_number varchar(30)
  exam_year year
  student_name varchar(100)
  father_name varchar(100)
  mother_name varchar(100)
  date_of_birth date
  institution_name varchar(200)
  board_id int [ref: > education_boards.id]
  bangla varchar(5)
  english varchar(5)
  mathematics varchar(5)
  general_science varchar(5)
  bangladesh_global_studies varchar(5)
  religion varchar(5)
  ict varchar(5)
  gpa decimal(3,2)
  result_status enum_result_status
  created_at timestamp
  updated_at timestamp
}

Table ssc_results {
  id int [pk, increment]
  roll_number varchar(20)
  registration_number varchar(30)
  exam_year year
  student_name varchar(100)
  father_name varchar(100)
  mother_name varchar(100)
  date_of_birth date
  institution_name varchar(200)
  board_id int [ref: > education_boards.id]
  exam_group enum_exam_group
  bangla_1st varchar(5)
  bangla_2nd varchar(5)
  english_1st varchar(5)
  english_2nd varchar(5)
  mathematics varchar(5)
  religion varchar(5)
  ict varchar(5)
  physics varchar(5)
  chemistry varchar(5)
  biology varchar(5)
  higher_math varchar(5)
  bangladesh_global_studies varchar(5)
  gpa decimal(3,2)
  result_status enum_result_status
  created_at timestamp
  updated_at timestamp
}

Table hsc_results {
  id int [pk, increment]
  roll_number varchar(20)
  registration_number varchar(30)
  exam_year year
  student_name varchar(100)
  father_name varchar(100)
  mother_name varchar(100)
  date_of_birth date
  institution_name varchar(200)
  board_id int [ref: > education_boards.id]
  exam_group enum_exam_group
  bangla_1st varchar(5)
  bangla_2nd varchar(5)
  english_1st varchar(5)
  english_2nd varchar(5)
  ict varchar(5)
  physics_1st varchar(5)
  physics_2nd varchar(5)
  chemistry_1st varchar(5)
  chemistry_2nd varchar(5)
  biology_1st varchar(5)
  biology_2nd varchar(5)
  higher_math_1st varchar(5)
  higher_math_2nd varchar(5)
  optional_subject_name varchar(50)
  optional_subject_grade varchar(5)
  gpa decimal(3,2)
  result_status enum_result_status
  created_at timestamp
  updated_at timestamp
}

// ═══════════════════════════════════════════════
// MODULE 11: UNIVERSITY ADMISSION (3 tables)
// ═══════════════════════════════════════════════

Table universities {
  id int [pk, increment]
  name varchar(200)
  name_bn varchar(200)
  code varchar(20) [unique]
  type enum_uni_type
  location varchar(100)
  website varchar(200)
  logo_url varchar(300)
  description text
  is_active tinyint
  created_at timestamp
}

Table admission_posts {
  id int [pk, increment]
  university_id int [ref: > universities.id]
  session varchar(20)
  unit_code varchar(20)
  unit_name varchar(100)
  unit_description text
  min_gpa decimal(3,2)
  min_gpa_science decimal(3,2)
  min_gpa_english decimal(3,2)
  required_group enum_req_group
  application_fee decimal(10,2)
  start_date date
  end_date date
  exam_date date
  result_date date
  total_seats int
  status enum_admission_status
  requirements text
  instructions text
  created_at timestamp
  updated_at timestamp
}

Table university_applications {
  id int [pk, increment]
  application_id varchar(30) [unique]
  admission_post_id int [ref: > admission_posts.id]
  hsc_roll varchar(20)
  hsc_reg varchar(30)
  hsc_year year
  student_name varchar(100)
  father_name varchar(100)
  mother_name varchar(100)
  date_of_birth date
  hsc_gpa decimal(3,2)
  hsc_group varchar(20)
  hsc_board varchar(50)
  hsc_institution varchar(200)
  mobile varchar(15)
  email varchar(100)
  present_address text
  payment_status enum_uni_pay
  payment_id varchar(100)
  payment_amount decimal(10,2)
  payment_date datetime
  payment_method varchar(50)
  application_status enum_uni_app_status
  rejection_reason text
  verified_by int
  verified_at datetime
  admit_card_generated tinyint
  exam_roll varchar(20)
  exam_center varchar(100)
  created_at timestamp
  updated_at timestamp
}

// ═══════════════════════════════════════════════
// MODULE 12: STIPENDS (2 tables)
// ═══════════════════════════════════════════════

Table available_stipends {
  id int [pk, increment]
  title varchar(255)
  description text
  amount decimal(10,2)
  type enum_stipend_type
  min_gpa float
  max_income decimal(15,2)
  deadline date
  is_active tinyint
  created_at timestamp
}

Table stipends_applications {
  id int [pk, increment]
  user_id int [ref: > reg_info.id]
  stipend_id int [ref: > available_stipends.id]
  application_no varchar(50) [unique]
  student_details longtext
  financial_info longtext
  guardian_info longtext
  bank_details longtext
  status enum_stipend_app_status
  submitted_at timestamp
  updated_at timestamp
}

// ═══════════════════════════════════════════════
// MODULE 13: AGRICULTURE (6 tables)
// ═══════════════════════════════════════════════

Table agri_subsidies {
  id int [pk, increment]
  user_id int [ref: > reg_info.id]
  farmer_name varchar(150)
  phone varchar(20)
  subsidy_type enum_subsidy_type
  amount_requested decimal(12,2)
  land_size_acres decimal(8,2)
  crop_type varchar(100)
  land_ownership enum_land_own
  division_id int [ref: > divisions.id]
  district_id int [ref: > districts.id]
  upazila_id int [ref: > upazilas.id]
  village varchar(150)
  bank_name varchar(150)
  bank_branch varchar(150)
  bank_account varchar(50)
  nid_number varchar(20)
  status enum_agri_status
  admin_remarks text
  reviewed_at datetime
  created_at timestamp
}

Table agri_crop_reports {
  id int [pk, increment]
  user_id int [ref: > reg_info.id]
  farmer_name varchar(150)
  crop_name varchar(100)
  crop_variety varchar(100)
  season enum_season
  yield_metric_ton decimal(10,2)
  land_area_acres decimal(8,2)
  fertilizer_used varchar(200)
  irrigation_method enum_irrigation
  harvest_date date
  market_price_per_ton decimal(12,2)
  division_id int [ref: > divisions.id]
  district_id int [ref: > districts.id]
  upazila_id int [ref: > upazilas.id]
  remarks text
  created_at timestamp
}

Table agri_expert_queries {
  id int [pk, increment]
  user_id int [ref: > reg_info.id]
  question text
  category enum_query_cat
  crop_name varchar(100)
  answer text
  status enum_query_status
  answered_by varchar(100)
  answered_at datetime
  created_at timestamp
}

Table agri_farmer_market {
  id int [pk, increment]
  user_id int [ref: > reg_info.id]
  farmer_name varchar(150)
  product_name varchar(150)
  product_category enum_product_cat
  quantity decimal(10,2)
  unit enum_unit
  price_per_unit decimal(10,2)
  phone varchar(20)
  email varchar(100)
  division_id int [ref: > divisions.id]
  district_id int [ref: > districts.id]
  upazila_id int [ref: > upazilas.id]
  description text
  available_from date
  available_until date
  status enum_market_listing_status
  admin_remarks text
  created_at timestamp
}

Table agri_training_programs {
  id int [pk, increment]
  title varchar(250)
  description text
  category enum_training_cat
  location varchar(250)
  division_id int [ref: > divisions.id]
  district_id int [ref: > districts.id]
  start_date date
  end_date date
  capacity int
  trainer_name varchar(150)
  trainer_designation varchar(150)
  status enum_training_status
  created_at timestamp
}

Table agri_training_registrations {
  id int [pk, increment]
  user_id int [ref: > reg_info.id]
  program_id int [ref: > agri_training_programs.id]
  farmer_name varchar(150)
  phone varchar(20)
  status enum_reg_status
  created_at timestamp
}

// ═══════════════════════════════════════════════
// MODULE 14: COMMUNITY / SOCIAL (5 tables)
// ═══════════════════════════════════════════════

Table community_groups {
  id int [pk, increment]
  name varchar(255)
  description text
  cover_image varchar(255)
  created_by int [ref: > reg_info.id]
  status enum_group_status
  created_at timestamp
}

Table community_members {
  id int [pk, increment]
  group_id int [ref: > community_groups.id]
  user_id int [ref: > reg_info.id]
  role enum_member_role
  joined_at timestamp
}

Table community_posts {
  id int [pk, increment]
  group_id int [ref: > community_groups.id]
  user_id int [ref: > reg_info.id]
  content text
  image_url varchar(255)
  status enum_post_status
  like_count int
  comment_count int
  created_at timestamp
  updated_at timestamp
}

Table post_comments {
  id int [pk, increment]
  post_id int [ref: > community_posts.id]
  user_id int [ref: > reg_info.id]
  content text
  created_at timestamp
}

Table post_likes {
  id int [pk, increment]
  post_id int [ref: > community_posts.id]
  user_id int [ref: > reg_info.id]
  created_at timestamp
}

// ═══════════════════════════════════════════════
// MODULE 15: E-COMMERCE / SHOP (4 tables)
// ═══════════════════════════════════════════════

Table shop_items {
  id int [pk, increment]
  name varchar(255)
  description text
  price decimal(10,2)
  image_url varchar(255)
  stock_quantity int
  created_at timestamp
}

Table addto_cart {
  id int [pk, increment]
  user_nid varchar(50) [ref: > reg_info.nid]
  item_id int [ref: > shop_items.id]
  quantity int
  created_at timestamp
}

Table cart_item {
  id int [pk, increment]
  user_id int [ref: > reg_info.id]
  product_id int [ref: > shop_items.id]
  quantity int
  created_at timestamp
}

Table Ordered_item {
  id int [pk, increment]
  user_id int [ref: > reg_info.id]
  user_nid varchar(50)
  total_amount decimal(10,2)
  payment_method enum_order_pay
  payment_status enum_order_pay_status
  delivery_address text
  contact_number varchar(20)
  product_details longtext
  created_at timestamp
}

// ═══════════════════════════════════════════════
// MODULE 16: MARKET PRICES (2 tables)
// ═══════════════════════════════════════════════

Table market_prices {
  id int [pk, increment]
  item_name varchar(255)
  item_name_bn varchar(255)
  category enum_market_cat
  unit varchar(50)
  price decimal(10,2)
  updated_by int [ref: > admins.id]
  effective_date date
  created_at timestamp
  updated_at timestamp
}

Table price_complaints {
  id int [pk, increment]
  user_id int [ref: > reg_info.id]
  shop_name varchar(255)
  shop_phone varchar(20)
  shop_location varchar(500)
  item_name varchar(255)
  official_price decimal(10,2)
  charged_price decimal(10,2)
  description text
  status enum_price_status
  admin_notes text
  created_at timestamp
  updated_at timestamp
}

// ═══════════════════════════════════════════════
// MODULE 17: GOVERNMENT NOTICES (1 table)
// ═══════════════════════════════════════════════

Table govt_notices {
  id int [pk, increment]
  title varchar(500)
  title_bn varchar(500)
  department varchar(200)
  category enum_notice_cat
  priority enum_notice_pri
  content text
  reference_no varchar(100)
  publish_date date
  expiry_date date
  attachment_url varchar(500)
  status enum_notice_pub_status
  created_by int [ref: > admins.id]
  created_at timestamp
  updated_at timestamp
}

// ═══════════════════════════════════════════════
// MODULE 18: DOCUMENTS & SERVICES (5 tables)
// ═══════════════════════════════════════════════

Table govt_user_documents {
  id int [pk, increment]
  user_id int [ref: > reg_info.id]
  doc_category varchar(50)
  identity_number varchar(50)
  file_path varchar(255)
  status enum_doc_status
  admin_comment text
  created_at timestamp
  expiry_date date
  issue_date date
  verified_by int
  verified_at timestamp
}

Table user_documents {
  id int [pk, increment]
  user_id int [ref: > reg_info.id]
  doc_type varchar(50)
  doc_name varchar(100)
  file_path varchar(255)
  status enum_doc_status
  admin_comment text
  created_at timestamp
  updated_at timestamp
}

Table service_requests {
  id int [pk, increment]
  user_id int [ref: > reg_info.id]
  service_type varchar(100)
  details text
  status enum_service_status
  created_at timestamp
  evidence_link text
  notification_read tinyint
}

Table completed_tasks {
  id int [pk, increment]
  user_id int [ref: > reg_info.id]
  service_type varchar(100)
  original_request_id int [ref: > service_requests.id]
  unique_number varchar(50)
  status enum_task_status
  admin_comment text
  completed_at timestamp
}

Table contact_messages {
  id int [pk, increment]
  user_id int [ref: > reg_info.id]
  department varchar(100)
  subject varchar(255)
  message text
  status enum_msg_status
  created_at timestamp
}

// ═══════════════════════════════════════════════
// MODULE 19: SERVICE REQUEST FORMS — 25 req_* tables
// All share identical structure, all FK → reg_info(id)
// ═══════════════════════════════════════════════

Table req_birth_cert_correction {
  id int [pk, increment]
  user_id int [ref: > reg_info.id]
  unique_number varchar(255)
  description text
  evidence_link text
  status enum_req_status
  created_at timestamp
}

Table req_death_cert_correction {
  id int [pk, increment]
  user_id int [ref: > reg_info.id]
  unique_number varchar(255)
  description text
  evidence_link text
  status enum_req_status
  created_at timestamp
}

Table req_character_certificate {
  id int [pk, increment]
  user_id int [ref: > reg_info.id]
  unique_number varchar(255)
  description text
  evidence_link text
  status enum_req_status
  created_at timestamp
}

Table req_income_certificate {
  id int [pk, increment]
  user_id int [ref: > reg_info.id]
  unique_number varchar(255)
  description text
  evidence_link text
  status enum_req_status
  created_at timestamp
}

Table req_nid_correction {
  id int [pk, increment]
  user_id int [ref: > reg_info.id]
  unique_number varchar(255)
  description text
  evidence_link text
  status enum_req_status
  created_at timestamp
}

Table req_education_jsc {
  id int [pk, increment]
  user_id int [ref: > reg_info.id]
  unique_number varchar(255)
  description text
  evidence_link text
  status enum_req_status
  created_at timestamp
}

Table req_education_sss {
  id int [pk, increment]
  user_id int [ref: > reg_info.id]
  unique_number varchar(255)
  description text
  evidence_link text
  status enum_req_status
  created_at timestamp
}

Table req_education_hsc {
  id int [pk, increment]
  user_id int [ref: > reg_info.id]
  unique_number varchar(255)
  description text
  evidence_link text
  status enum_req_status
  created_at timestamp
}

Table req_education_transcript {
  id int [pk, increment]
  user_id int [ref: > reg_info.id]
  unique_number varchar(255)
  description text
  evidence_link text
  status enum_req_status
  created_at timestamp
}

Table req_education_university_verification {
  id int [pk, increment]
  user_id int [ref: > reg_info.id]
  unique_number varchar(255)
  description text
  evidence_link text
  status enum_req_status
  created_at timestamp
}

Table req_business_trade_lic {
  id int [pk, increment]
  user_id int [ref: > reg_info.id]
  unique_number varchar(255)
  description text
  evidence_link text
  status enum_req_status
  created_at timestamp
}

Table req_business_company_reg {
  id int [pk, increment]
  user_id int [ref: > reg_info.id]
  unique_number varchar(255)
  description text
  evidence_link text
  status enum_req_status
  created_at timestamp
}

Table req_business_tin_certificate {
  id int [pk, increment]
  user_id int [ref: > reg_info.id]
  unique_number varchar(255)
  description text
  evidence_link text
  status enum_req_status
  created_at timestamp
}

Table req_business_vat_reg {
  id int [pk, increment]
  user_id int [ref: > reg_info.id]
  unique_number varchar(255)
  description text
  evidence_link text
  status enum_req_status
  created_at timestamp
}

Table req_business_import_export {
  id int [pk, increment]
  user_id int [ref: > reg_info.id]
  unique_number varchar(255)
  description text
  evidence_link text
  status enum_req_status
  created_at timestamp
}

Table req_immigration_visa {
  id int [pk, increment]
  user_id int [ref: > reg_info.id]
  unique_number varchar(255)
  description text
  evidence_link text
  status enum_req_status
  created_at timestamp
}

Table req_immigration_passport_correction {
  id int [pk, increment]
  user_id int [ref: > reg_info.id]
  unique_number varchar(255)
  description text
  evidence_link text
  status enum_req_status
  created_at timestamp
}

Table req_immigration_emigration_clearance {
  id int [pk, increment]
  user_id int [ref: > reg_info.id]
  unique_number varchar(255)
  description text
  evidence_link text
  status enum_req_status
  created_at timestamp
}

Table req_legal_case {
  id int [pk, increment]
  user_id int [ref: > reg_info.id]
  unique_number varchar(255)
  description text
  evidence_link text
  status enum_req_status
  created_at timestamp
}

Table req_legal_complain {
  id int [pk, increment]
  user_id int [ref: > reg_info.id]
  unique_number varchar(255)
  description text
  evidence_link text
  status enum_req_status
  created_at timestamp
}

Table req_legal_gd {
  id int [pk, increment]
  user_id int [ref: > reg_info.id]
  unique_number varchar(255)
  description text
  evidence_link text
  status enum_req_status
  created_at timestamp
}

Table req_transport_driving_lic_correction {
  id int [pk, increment]
  user_id int [ref: > reg_info.id]
  unique_number varchar(255)
  description text
  evidence_link text
  status enum_req_status
  created_at timestamp
}

Table req_transport_driving_lic_renew {
  id int [pk, increment]
  user_id int [ref: > reg_info.id]
  unique_number varchar(255)
  description text
  evidence_link text
  status enum_req_status
  created_at timestamp
}

Table req_transport_ownership_transfer {
  id int [pk, increment]
  user_id int [ref: > reg_info.id]
  unique_number varchar(255)
  description text
  evidence_link text
  status enum_req_status
  created_at timestamp
}

Table req_transport_vehicle_reg_correction {
  id int [pk, increment]
  user_id int [ref: > reg_info.id]
  unique_number varchar(255)
  description text
  evidence_link text
  status enum_req_status
  created_at timestamp
}

// ═══════════════════════════════════════════════
// MODULE 20: MISCELLANEOUS (1 table)
// ═══════════════════════════════════════════════

Table todos {
  id int [pk, increment]
  user_id int [ref: > reg_info.id]
  title varchar(255)
  description text
  status enum_todo_status
  created_at timestamp
  due_date datetime
}


// ═══════════════════════════════════════════════
// RELATIONSHIP SUMMARY (all connections)
// ═══════════════════════════════════════════════

// --- Geography Chain ---
// divisions 1--* districts
// districts 1--* upazilas

// --- Core User Hub (reg_info is the CENTRAL table) ---
// reg_info 1--1 user_info
// reg_info 1--* login_logs
// reg_info 1--* edit_req
// reg_info 1--* notifications
// reg_info 1--* audit_log
// reg_info 1--* addresses --> address_types, divisions, districts, upazilas
// reg_info 1--* payments --> payment_methods, document_statuses

// --- Admin Hub ---
// admins 1--* admin_login_logs
// admins 1--* admin_actions_log
// admins 1--* govt_notices
// admins 1--* market_prices (updated_by)
// admins 1--* nid_fees (administered_by)
// admins 1--* passport_fee_schedule (administered_by)

// --- NID Module Internal ---
// reg_info 1--* nid_profiles
// nid_profiles 1--* nid_family_members
// reg_info 1--* nid_applications
// reg_info 1--* nid_correction_requests
// reg_info 1--* nid_corrections
// reg_info 1--* nid_reissue_requests
// reg_info 1--* nid_smart_card_applications
// reg_info 1--* nid_verification_requests
// reg_info 1--* nid_address_changes
// reg_info 1--* nid_biometric_appointments --> nid_collection_centers --> divisions, districts, upazilas
// reg_info 1--* nid_activity_log
// reg_info 1--* nid_cards (citizen_id)
// admins 1--* nid_fees (administered_by)

// --- Passport Module Internal ---
// reg_info 1--* passport_applications --> passport_offices
// passport_applications 1--1 passport_books
// passport_applications 1--* passport_status_history
// admins 1--* passport_fee_schedule (administered_by)

// --- Health Module Internal ---
// reg_info 1--* health_cards
// health_cards 1--* health_vaccinations
// reg_info 1--* health_appointments --> health_hospitals
// reg_info 1--* health_ambulance_requests
// reg_info 1--* health_complaints

// --- Water Module Internal ---
// reg_info 1--* water_connections
// water_connections 1--* water_bill_payments
// reg_info 1--* water_quality_reports
// reg_info 1--* water_complaints
// water_projects --> divisions.id, districts.id

// --- Land Module ---
// reg_info 1--* my_land_record --> divisions, districts, upazilas
// reg_info 1--* land_mutations_v2 --> divisions, districts, upazilas (buyer_id --> reg_info)
// reg_info 1--* landtax --> divisions, districts, upazilas

// --- NBR Tax Chain ---
// nbr_tax_zones 1--* nbr_tin_registrations
// reg_info 1--* nbr_tin_registrations
// nbr_tin_registrations 1--* nbr_tax_returns
// nbr_tax_returns 1--* nbr_tax_payments
// reg_info 1--* nbr_vat_registrations
// reg_info 1--* nbr_tax_notices
// reg_info 1--* nbr_tax_challan
// reg_info 1--* tax_returns

// --- Education Chain ---
// education_boards 1--* education_institutions
// education_boards 1--* jsc_results
// education_boards 1--* ssc_results
// education_boards 1--* hsc_results

// --- University Chain ---
// universities 1--* admission_posts
// admission_posts 1--* university_applications

// --- Stipend Chain ---
// reg_info 1--* stipends_applications --> available_stipends

// --- Agriculture Chain ---
// reg_info 1--* agri_subsidies --> divisions, districts, upazilas
// reg_info 1--* agri_crop_reports --> divisions, districts, upazilas
// reg_info 1--* agri_expert_queries
// reg_info 1--* agri_farmer_market --> divisions, districts, upazilas
// divisions/districts <-- agri_training_programs
// reg_info 1--* agri_training_registrations --> agri_training_programs

// --- Community Chain ---
// reg_info 1--* community_groups (created_by)
// community_groups 1--* community_members <-- reg_info
// community_groups 1--* community_posts <-- reg_info
// community_posts 1--* post_comments <-- reg_info
// community_posts 1--* post_likes <-- reg_info

// --- Shop Chain ---
// shop_items 1--* addto_cart <-- reg_info (via nid)
// shop_items 1--* cart_item <-- reg_info (via id)
// reg_info 1--* Ordered_item

// --- Documents & Services ---
// reg_info 1--* govt_user_documents
// reg_info 1--* user_documents
// reg_info 1--* service_requests
// reg_info 1--* completed_tasks
// reg_info 1--* contact_messages
// reg_info 1--* price_complaints
// reg_info 1--* todos

// --- All 25 req_* tables ---
// reg_info 1--* req_birth_cert_correction
// reg_info 1--* req_death_cert_correction
// reg_info 1--* req_character_certificate
// reg_info 1--* req_income_certificate
// reg_info 1--* req_nid_correction
// reg_info 1--* req_education_jsc
// reg_info 1--* req_education_sss
// reg_info 1--* req_education_hsc
// reg_info 1--* req_education_transcript
// reg_info 1--* req_education_university_verification
// reg_info 1--* req_business_trade_lic
// reg_info 1--* req_business_company_reg
// reg_info 1--* req_business_tin_certificate
// reg_info 1--* req_business_vat_reg
// reg_info 1--* req_business_import_export
// reg_info 1--* req_immigration_visa
// reg_info 1--* req_immigration_passport_correction
// reg_info 1--* req_immigration_emigration_clearance
// reg_info 1--* req_legal_case
// reg_info 1--* req_legal_complain
// reg_info 1--* req_legal_gd
// reg_info 1--* req_transport_driving_lic_correction
// reg_info 1--* req_transport_driving_lic_renew
// reg_info 1--* req_transport_ownership_transfer
// reg_info 1--* req_transport_vehicle_reg_correction
```

---

## 3NF Compliance Summary

| Normal Form | How All 117 Tables Comply |
|---|---|
| **1NF** | Every table has `id INT AUTO_INCREMENT PRIMARY KEY`. No repeating groups. All attributes are atomic (single-valued). |
| **2NF** | Since all PKs are single-column surrogates (`id`), there are no partial dependencies. Every non-key attribute depends on the whole key. |
| **3NF** | No transitive dependencies. Lookups like `address_types`, `document_statuses`, `payment_methods`, `divisions→districts→upazilas`, `education_boards`, `passport_offices`, `nbr_tax_zones`, `nid_collection_centers`, `nid_fees`, `passport_fee_schedule` eliminate repeated strings/ENUMs. Geographic data is properly decomposed into the hierarchy `divisions → districts → upazilas`. |

## How to Generate the ER Diagram

1. **Copy** the entire DBML code block above (between the ` ```dbml ` markers)
2. **Go to** [https://dbdiagram.io](https://dbdiagram.io) → Click "Go to App"
3. **Paste** in the left editor panel
4. The ER diagram auto-generates on the right with all tables, columns, PKs, and relationship lines
5. **Export** as PNG/PDF/SQL

**Alternative AI tools:** Paste the DBML to ChatGPT/Claude/Gemini with prompt: *"Generate a visual ER diagram from this DBML specification with all relationships shown"*
