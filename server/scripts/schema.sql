create extension if not exists pgcrypto;

-- 1. MEMBERS
create table if not exists public.members (
    id text primary key,
    name text not null,
    nickname text,
    division text,
    class text,
    bio text,
    quote text,
    avatar text,
    instagram text,
    birthday date,
    gender text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint members_gender_check
        check (gender is null or gender in ('male', 'female'))
);

-- 2. MENTORS
create table if not exists public.mentors (
    id text primary key,
    nickname text,
    name text not null,
    role text,
    avatar text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- 3. EVENTS
create table if not exists public.events (
    id text primary key,
    title text not null,
    date date,
    description text,
    image text,
    category text,
    highlight boolean not null default false,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- 4. ALBUMS
create table if not exists public.albums (
    id text primary key,
    title text not null,
    category text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- 5. ALBUM PHOTOS
create table if not exists public.album_photos (
    id uuid primary key default gen_random_uuid(),
    album_id text not null,
    image text not null,
    caption text,
    photo_order integer not null default 0,
    created_at timestamptz not null default now(),

    constraint album_photos_album_id_fkey
        foreign key (album_id)
        references public.albums(id)
        on delete cascade,

    constraint album_photos_photo_order_check
        check (photo_order >= 0),

    constraint album_photos_album_order_unique
        unique (album_id, photo_order)
);

-- 6. MESSAGES
create table if not exists public.messages (
    id text primary key,
    author text not null,
    type text,
    message text not null,
    date date,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.users (
    id uuid primary key default gen_random_uuid(),
    member_id text references public.members(id) on delete set null,
    nickname text unique not null,
    password_hash text not null,
    role text not null default 'visitor' check (role in ('member', 'visitor')),
    is_locked boolean default false,
    locked_until timestamptz,
    failed_attempts integer default 0,
    last_failed_at timestamptz,
    created_at timestamptz not null default now()
);

create index if not exists idx_users_nickname on public.users(nickname);
create index if not exists idx_users_member_id on public.users(member_id);

alter table public.users enable row level security;

-- 7. INDEXES

-- Members
create index if not exists idx_members_gender
    on public.members(gender);

create index if not exists idx_members_class
    on public.members(class);

create index if not exists idx_members_name
    on public.members(name);

-- Mentors
create index if not exists idx_mentors_name
    on public.mentors(name);

-- Events
create index if not exists idx_events_date
    on public.events(date);

create index if not exists idx_events_category
    on public.events(category);

create index if not exists idx_events_highlight
    on public.events(highlight);

-- Albums
create index if not exists idx_albums_category
    on public.albums(category);

-- Album photos
create index if not exists idx_album_photos_album_id
    on public.album_photos(album_id);

-- Messages
create index if not exists idx_messages_date
    on public.messages(date);

-- 8. UPDATED_AT TRIGGER
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

drop trigger if exists members_set_updated_at on public.members;
create trigger members_set_updated_at
before update on public.members
for each row
execute function public.set_updated_at();

drop trigger if exists mentors_set_updated_at on public.mentors;
create trigger mentors_set_updated_at
before update on public.mentors
for each row
execute function public.set_updated_at();

drop trigger if exists events_set_updated_at on public.events;
create trigger events_set_updated_at
before update on public.events
for each row
execute function public.set_updated_at();

drop trigger if exists albums_set_updated_at on public.albums;
create trigger albums_set_updated_at
before update on public.albums
for each row
execute function public.set_updated_at();

drop trigger if exists messages_set_updated_at on public.messages;
create trigger messages_set_updated_at
before update on public.messages
for each row
execute function public.set_updated_at();

-- 9. SUPABASE ROW LEVEL SECURITY
alter table public.members enable row level security;
alter table public.mentors enable row level security;
alter table public.events enable row level security;
alter table public.albums enable row level security;
alter table public.album_photos enable row level security;
alter table public.messages enable row level security;


-- Remove old policies with the same names so this script
-- can safely be executed again.
drop policy if exists "Public can read members" on public.members;
drop policy if exists "Public can read mentors" on public.mentors;
drop policy if exists "Public can read events" on public.events;
drop policy if exists "Public can read albums" on public.albums;
drop policy if exists "Public can read album photos" on public.album_photos;
drop policy if exists "Public can read messages" on public.messages;


-- Public read-only access.
create policy "Public can read members"
on public.members
for select
to anon, authenticated
using (true);

create policy "Public can read mentors"
on public.mentors
for select
to anon, authenticated
using (true);

create policy "Public can read events"
on public.events
for select
to anon, authenticated
using (true);

create policy "Public can read albums"
on public.albums
for select
to anon, authenticated
using (true);

create policy "Public can read album photos"
on public.album_photos
for select
to anon, authenticated
using (true);

create policy "Public can read messages"
on public.messages
for select
to anon, authenticated
using (true);