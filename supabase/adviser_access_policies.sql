-- Allow a manually selected adviser to read assigned research records.
create policy "Assigned advisers can view research"
on public.research
for select
to public
using (adviser_id = auth.uid()::text);
