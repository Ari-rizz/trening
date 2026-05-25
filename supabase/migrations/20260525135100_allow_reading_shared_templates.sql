/*
  # Allow reading shared templates and their exercises

  ## Problem
  RLS on workout_templates and template_exercises only permits owners to SELECT.
  When user A imports user B's shared plan, the join to workout_templates returns
  null because RLS blocks the row, causing a runtime crash.

  ## Changes
  1. New SELECT policy on workout_templates:
     - Any authenticated user can read a template if it appears in shared_templates
  2. New SELECT policy on template_exercises:
     - Any authenticated user can read exercises for a template that is shared
*/

CREATE POLICY "Authenticated users can read shared templates"
  ON workout_templates FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM shared_templates
      WHERE shared_templates.template_id = workout_templates.id
    )
  );

CREATE POLICY "Authenticated users can read shared template exercises"
  ON template_exercises FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM shared_templates
      WHERE shared_templates.template_id = template_exercises.template_id
    )
  );
