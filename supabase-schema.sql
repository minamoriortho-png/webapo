-- MVP用テーブル案
create table appointment_types (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  duration_minutes integer not null,
  is_active boolean default true,
  is_visible_to_patients boolean default true,
  is_web_bookable boolean default true,
  created_at timestamptz default now()
);

create table patients (
  id uuid primary key default gen_random_uuid(),
  patient_code text,
  name text not null,
  kana text,
  phone text,
  email text,
  birthday date,
  created_at timestamptz default now()
);

create table chairs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  display_order integer default 0
);

create table appointments (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references patients(id),
  appointment_type_id uuid references appointment_types(id),
  chair_id uuid references chairs(id),
  start_time timestamptz not null,
  end_time timestamptz not null,
  status text default '予約確定',
  memo text,
  created_at timestamptz default now()
);

create table regular_holidays (
  id uuid primary key default gen_random_uuid(),
  day_of_week integer not null,
  is_closed boolean default true
);

create table special_holidays (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  reason text,
  is_closed boolean default true
);
