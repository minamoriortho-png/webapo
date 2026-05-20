-- Supabase用の参考スキーマ
-- このMVPの画面をDB化するときの出発点です。

create table appointment_types (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  duration_minutes integer not null,
  description text,
  display_order integer default 0,
  color_label text,
  is_active boolean default true,
  is_visible_to_patients boolean default true,
  is_web_bookable boolean default true,
  is_for_new_patients boolean default true,
  is_for_existing_patients boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table chairs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  display_order integer default 0,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table patients (
  id uuid primary key default gen_random_uuid(),
  patient_code text unique,
  name text not null,
  kana text,
  phone text,
  phone_normalized text,
  birthday date,
  email text,
  treatment_status text,
  memo text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table appointments (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references patients(id),
  appointment_type_id uuid references appointment_types(id),
  chair_id uuid references chairs(id),
  start_time timestamptz not null,
  end_time timestamptz not null,
  status text not null default '予約確定',
  memo text,
  privacy_policy_agreed boolean default false,
  privacy_policy_agreed_at timestamptz,
  privacy_policy_version text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table regular_holidays (
  id uuid primary key default gen_random_uuid(),
  day_of_week integer not null, -- 0:日曜, 1:月曜 ... 6:土曜
  is_closed boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table special_holidays (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  reason text,
  is_closed boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table staff_shifts (
  id uuid primary key default gen_random_uuid(),
  staff_name text not null,
  shift_date date not null,
  am boolean default true,
  pm boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

insert into appointment_types (name, duration_minutes, is_for_new_patients, is_for_existing_patients) values
('初診相談', 60, true, false),
('検査', 60, false, true),
('診断', 30, false, true),
('調整', 30, false, true),
('装置装着', 60, false, true),
('装置除去', 60, false, true),
('保定観察', 30, false, true),
('急患', 30, false, true);

insert into chairs (name, display_order) values
('チェア1', 1),
('チェア2', 2),
('初診', 3),
('SOS&初診小児用', 4);
