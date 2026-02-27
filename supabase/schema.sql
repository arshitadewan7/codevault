-- Enable UUID generation
create extension if not exists "pgcrypto";

-- Profiles
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  updated_at timestamptz default now()
);

-- Projects
create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete cascade,
  name text not null,
  color text,
  "desc" text,
  open boolean default true,
  created_at timestamptz default now()
);

create table if not exists project_collaborators (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  role text check (role in ('owner','editor','viewer')) default 'viewer',
  created_at timestamptz default now(),
  unique (project_id, user_id)
);

create table if not exists project_invites (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  email text not null,
  role text check (role in ('editor','viewer')) default 'viewer',
  invited_by uuid references auth.users(id) on delete set null,
  status text check (status in ('pending','accepted','revoked')) default 'pending',
  created_at timestamptz default now()
);

-- Snippets
create table if not exists snippets (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  title text,
  code text,
  notes text,
  lang text,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists snippet_versions (
  id uuid primary key default gen_random_uuid(),
  snippet_id uuid references snippets(id) on delete cascade,
  title text,
  code text,
  notes text,
  lang text,
  msg text,
  author_id uuid references auth.users(id) on delete set null,
  created_at timestamptz default now()
);

create table if not exists snippet_comments (
  id uuid primary key default gen_random_uuid(),
  snippet_id uuid references snippets(id) on delete cascade,
  body text,
  author_id uuid references auth.users(id) on delete set null,
  created_at timestamptz default now()
);

-- RLS
alter table profiles enable row level security;
alter table projects enable row level security;
alter table project_collaborators enable row level security;
alter table project_invites enable row level security;
alter table snippets enable row level security;
alter table snippet_versions enable row level security;
alter table snippet_comments enable row level security;

-- Profiles
create policy "profiles read" on profiles
  for select using (auth.uid() = id);

create policy "profiles upsert" on profiles
  for insert with check (auth.uid() = id);

create policy "profiles update" on profiles
  for update using (auth.uid() = id);

-- Projects
create policy "projects read" on projects
  for select using (
    owner_id = auth.uid() or
    exists (
      select 1 from project_collaborators pc
      where pc.project_id = id and pc.user_id = auth.uid()
    )
  );

create policy "projects write" on projects
  for insert with check (auth.uid() = owner_id);

create policy "projects update" on projects
  for update using (auth.uid() = owner_id);

create policy "projects delete" on projects
  for delete using (auth.uid() = owner_id);

-- Collaborators
create policy "collaborators read" on project_collaborators
  for select using (
    exists (
      select 1 from projects p
      where p.id = project_id and (p.owner_id = auth.uid())
    ) or user_id = auth.uid()
  );

create policy "collaborators manage" on project_collaborators
  for insert with check (
    exists (select 1 from projects p where p.id = project_id and p.owner_id = auth.uid())
  );

create policy "collaborators update" on project_collaborators
  for update using (
    exists (select 1 from projects p where p.id = project_id and p.owner_id = auth.uid())
  );

create policy "collaborators delete" on project_collaborators
  for delete using (
    exists (select 1 from projects p where p.id = project_id and p.owner_id = auth.uid())
  );

-- Invites
create policy "invites read" on project_invites
  for select using (
    exists (select 1 from projects p where p.id = project_id and p.owner_id = auth.uid())
    or email = (select email from auth.users where id = auth.uid())
  );

create policy "invites manage" on project_invites
  for insert with check (
    exists (select 1 from projects p where p.id = project_id and p.owner_id = auth.uid())
  );

create policy "invites update" on project_invites
  for update using (
    exists (select 1 from projects p where p.id = project_id and p.owner_id = auth.uid())
    or email = (select email from auth.users where id = auth.uid())
  );

create policy "invites delete" on project_invites
  for delete using (
    exists (select 1 from projects p where p.id = project_id and p.owner_id = auth.uid())
  );

-- Snippets
create policy "snippets read" on snippets
  for select using (
    exists (
      select 1 from project_collaborators pc
      where pc.project_id = project_id and pc.user_id = auth.uid()
    )
  );

create policy "snippets write" on snippets
  for insert with check (
    exists (
      select 1 from project_collaborators pc
      where pc.project_id = project_id and pc.user_id = auth.uid()
        and pc.role in ('owner','editor')
    )
  );

create policy "snippets update" on snippets
  for update using (
    exists (
      select 1 from project_collaborators pc
      where pc.project_id = project_id and pc.user_id = auth.uid()
        and pc.role in ('owner','editor')
    )
  );

create policy "snippets delete" on snippets
  for delete using (
    exists (
      select 1 from project_collaborators pc
      where pc.project_id = project_id and pc.user_id = auth.uid()
        and pc.role in ('owner','editor')
    )
  );

-- Versions
create policy "versions read" on snippet_versions
  for select using (
    exists (
      select 1 from snippets s
      join project_collaborators pc on pc.project_id = s.project_id
      where s.id = snippet_id and pc.user_id = auth.uid()
    )
  );

create policy "versions write" on snippet_versions
  for insert with check (
    exists (
      select 1 from snippets s
      join project_collaborators pc on pc.project_id = s.project_id
      where s.id = snippet_id and pc.user_id = auth.uid()
        and pc.role in ('owner','editor')
    )
  );

create policy "versions delete" on snippet_versions
  for delete using (
    exists (
      select 1 from snippets s
      join project_collaborators pc on pc.project_id = s.project_id
      where s.id = snippet_id and pc.user_id = auth.uid()
        and pc.role in ('owner','editor')
    )
  );

-- Comments
create policy "comments read" on snippet_comments
  for select using (
    exists (
      select 1 from snippets s
      join project_collaborators pc on pc.project_id = s.project_id
      where s.id = snippet_id and pc.user_id = auth.uid()
    )
  );

create policy "comments write" on snippet_comments
  for insert with check (
    exists (
      select 1 from snippets s
      join project_collaborators pc on pc.project_id = s.project_id
      where s.id = snippet_id and pc.user_id = auth.uid()
    )
  );

create policy "comments delete" on snippet_comments
  for delete using (
    author_id = auth.uid()
  );

-- Realtime
alter publication supabase_realtime add table projects;
alter publication supabase_realtime add table project_collaborators;
alter publication supabase_realtime add table project_invites;
alter publication supabase_realtime add table snippets;
alter publication supabase_realtime add table snippet_versions;
alter publication supabase_realtime add table snippet_comments;
