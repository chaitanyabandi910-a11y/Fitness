-- foods.created_by had no ON DELETE behavior (default NO ACTION), so
-- deleting a user who'd created a personal food (manual entry or photo
-- scan) failed with a foreign key violation. The food itself still has
-- standalone value (other users can search/log it too), so orphan the
-- reference instead of blocking the delete or cascading the food away.
alter table public.foods
  drop constraint foods_created_by_fkey,
  add constraint foods_created_by_fkey
    foreign key (created_by) references auth.users(id) on delete set null;
