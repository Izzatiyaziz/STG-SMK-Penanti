do $$
declare
    final_2025_exam_id uuid := 'a0000000-0000-0000-0000-000000000003';
begin
    insert into stg_exams (exam_id, exam_name, academic_year, subject_settings)
    select
        final_2025_exam_id,
        'Peperiksaan Akhir Tahun',
        '2025',
        coalesce(
            jsonb_object_agg(
                assigned_subjects.subject_id::text,
                jsonb_build_object(
                    'deadline', '2025-11-20',
                    'objective_questions', 10,
                    'objective_max', 40,
                    'subjective_max', 60
                )
            ),
            '{}'::jsonb
        )
    from (
        select distinct subject_id
        from stg_teacher_subject
        where subject_id is not null
    ) assigned_subjects
    on conflict (exam_id) do update set
        exam_name = excluded.exam_name,
        academic_year = excluded.academic_year,
        subject_settings = excluded.subject_settings;

    with assigned_students as (
        select distinct on (ts.class_id, ts.subject_id, st.student_id)
            ts.teacher_id,
            ts.class_id,
            ts.subject_id,
            st.student_id,
            coalesce(c.grade, 0) as grade_level
        from stg_teacher_subject ts
        join stg_students st on st.class_id = ts.class_id
        left join stg_classes c on c.class_id = ts.class_id
        where ts.teacher_id is not null
          and ts.class_id is not null
          and ts.subject_id is not null
          and st.student_id is not null
        order by ts.class_id, ts.subject_id, st.student_id, ts.teacher_id
    ),
    marks as (
        select
            teacher_id,
            class_id,
            subject_id,
            student_id,
            grade_level,
            (20 + mod(abs(hashtext(student_id::text || subject_id::text || 'objective-2025')), 19))::int as objective_mark,
            (28 + mod(abs(hashtext(student_id::text || subject_id::text || teacher_id::text || 'subjective-2025')), 29))::int as subjective_mark
        from assigned_students
    ),
    computed as (
        select
            teacher_id,
            class_id,
            subject_id,
            student_id,
            grade_level,
            objective_mark,
            subjective_mark,
            least(100, objective_mark + subjective_mark) as total_mark
        from marks
    ),
    ids as (
        select
            *,
            (
                substr(md5('omr-2025-' || student_id::text || '-' || subject_id::text), 1, 8) || '-' ||
                substr(md5('omr-2025-' || student_id::text || '-' || subject_id::text), 9, 4) || '-' ||
                substr(md5('omr-2025-' || student_id::text || '-' || subject_id::text), 13, 4) || '-' ||
                substr(md5('omr-2025-' || student_id::text || '-' || subject_id::text), 17, 4) || '-' ||
                substr(md5('omr-2025-' || student_id::text || '-' || subject_id::text), 21, 12)
            )::uuid as omr_scan_id,
            (
                substr(md5('subjective-2025-' || teacher_id::text || '-' || student_id::text || '-' || subject_id::text), 1, 8) || '-' ||
                substr(md5('subjective-2025-' || teacher_id::text || '-' || student_id::text || '-' || subject_id::text), 9, 4) || '-' ||
                substr(md5('subjective-2025-' || teacher_id::text || '-' || student_id::text || '-' || subject_id::text), 13, 4) || '-' ||
                substr(md5('subjective-2025-' || teacher_id::text || '-' || student_id::text || '-' || subject_id::text), 17, 4) || '-' ||
                substr(md5('subjective-2025-' || teacher_id::text || '-' || student_id::text || '-' || subject_id::text), 21, 12)
            )::uuid as subjective_id,
            (
                substr(md5('result-2025-' || student_id::text || '-' || subject_id::text), 1, 8) || '-' ||
                substr(md5('result-2025-' || student_id::text || '-' || subject_id::text), 9, 4) || '-' ||
                substr(md5('result-2025-' || student_id::text || '-' || subject_id::text), 13, 4) || '-' ||
                substr(md5('result-2025-' || student_id::text || '-' || subject_id::text), 17, 4) || '-' ||
                substr(md5('result-2025-' || student_id::text || '-' || subject_id::text), 21, 12)
            )::uuid as result_id
        from computed
    )
    insert into stg_omr_scans (
        omr_scan_id, student_id, subject_id, exam_id, objective_total_mark, scan_date
    )
    select
        omr_scan_id,
        student_id,
        subject_id,
        final_2025_exam_id,
        objective_mark,
        '2025-11-25'::date
    from ids
    on conflict (omr_scan_id) do update set
        objective_total_mark = excluded.objective_total_mark,
        scan_date = excluded.scan_date;

    with assigned_students as (
        select distinct on (ts.class_id, ts.subject_id, st.student_id)
            ts.teacher_id,
            ts.class_id,
            ts.subject_id,
            st.student_id,
            coalesce(c.grade, 0) as grade_level
        from stg_teacher_subject ts
        join stg_students st on st.class_id = ts.class_id
        left join stg_classes c on c.class_id = ts.class_id
        where ts.teacher_id is not null
          and ts.class_id is not null
          and ts.subject_id is not null
          and st.student_id is not null
        order by ts.class_id, ts.subject_id, st.student_id, ts.teacher_id
    ),
    marks as (
        select
            teacher_id,
            class_id,
            subject_id,
            student_id,
            grade_level,
            (20 + mod(abs(hashtext(student_id::text || subject_id::text || 'objective-2025')), 19))::int as objective_mark,
            (28 + mod(abs(hashtext(student_id::text || subject_id::text || teacher_id::text || 'subjective-2025')), 29))::int as subjective_mark
        from assigned_students
    ),
    computed as (
        select
            *,
            least(100, objective_mark + subjective_mark) as total_mark
        from marks
    ),
    ids as (
        select
            *,
            (
                substr(md5('subjective-2025-' || teacher_id::text || '-' || student_id::text || '-' || subject_id::text), 1, 8) || '-' ||
                substr(md5('subjective-2025-' || teacher_id::text || '-' || student_id::text || '-' || subject_id::text), 9, 4) || '-' ||
                substr(md5('subjective-2025-' || teacher_id::text || '-' || student_id::text || '-' || subject_id::text), 13, 4) || '-' ||
                substr(md5('subjective-2025-' || teacher_id::text || '-' || student_id::text || '-' || subject_id::text), 17, 4) || '-' ||
                substr(md5('subjective-2025-' || teacher_id::text || '-' || student_id::text || '-' || subject_id::text), 21, 12)
            )::uuid as subjective_id
        from computed
    )
    insert into stg_subjective_marks (
        subjective_id, teacher_id, student_id, subject_id, exam_id, subjective_mark, input_date
    )
    select
        subjective_id,
        teacher_id,
        student_id,
        subject_id,
        final_2025_exam_id,
        subjective_mark,
        '2025-11-26'::date
    from ids
    on conflict (subjective_id) do update set
        subjective_mark = excluded.subjective_mark,
        input_date = excluded.input_date;

    with assigned_students as (
        select distinct on (ts.class_id, ts.subject_id, st.student_id)
            ts.teacher_id,
            ts.class_id,
            ts.subject_id,
            st.student_id,
            coalesce(c.grade, 0) as grade_level
        from stg_teacher_subject ts
        join stg_students st on st.class_id = ts.class_id
        left join stg_classes c on c.class_id = ts.class_id
        where ts.teacher_id is not null
          and ts.class_id is not null
          and ts.subject_id is not null
          and st.student_id is not null
        order by ts.class_id, ts.subject_id, st.student_id, ts.teacher_id
    ),
    marks as (
        select
            teacher_id,
            class_id,
            subject_id,
            student_id,
            grade_level,
            (20 + mod(abs(hashtext(student_id::text || subject_id::text || 'objective-2025')), 19))::int as objective_mark,
            (28 + mod(abs(hashtext(student_id::text || subject_id::text || teacher_id::text || 'subjective-2025')), 29))::int as subjective_mark
        from assigned_students
    ),
    computed as (
        select
            *,
            least(100, objective_mark + subjective_mark) as total_mark
        from marks
    ),
    ids as (
        select
            *,
            (
                substr(md5('omr-2025-' || student_id::text || '-' || subject_id::text), 1, 8) || '-' ||
                substr(md5('omr-2025-' || student_id::text || '-' || subject_id::text), 9, 4) || '-' ||
                substr(md5('omr-2025-' || student_id::text || '-' || subject_id::text), 13, 4) || '-' ||
                substr(md5('omr-2025-' || student_id::text || '-' || subject_id::text), 17, 4) || '-' ||
                substr(md5('omr-2025-' || student_id::text || '-' || subject_id::text), 21, 12)
            )::uuid as omr_scan_id,
            (
                substr(md5('subjective-2025-' || teacher_id::text || '-' || student_id::text || '-' || subject_id::text), 1, 8) || '-' ||
                substr(md5('subjective-2025-' || teacher_id::text || '-' || student_id::text || '-' || subject_id::text), 9, 4) || '-' ||
                substr(md5('subjective-2025-' || teacher_id::text || '-' || student_id::text || '-' || subject_id::text), 13, 4) || '-' ||
                substr(md5('subjective-2025-' || teacher_id::text || '-' || student_id::text || '-' || subject_id::text), 17, 4) || '-' ||
                substr(md5('subjective-2025-' || teacher_id::text || '-' || student_id::text || '-' || subject_id::text), 21, 12)
            )::uuid as subjective_id,
            (
                substr(md5('result-2025-' || student_id::text || '-' || subject_id::text), 1, 8) || '-' ||
                substr(md5('result-2025-' || student_id::text || '-' || subject_id::text), 9, 4) || '-' ||
                substr(md5('result-2025-' || student_id::text || '-' || subject_id::text), 13, 4) || '-' ||
                substr(md5('result-2025-' || student_id::text || '-' || subject_id::text), 17, 4) || '-' ||
                substr(md5('result-2025-' || student_id::text || '-' || subject_id::text), 21, 12)
            )::uuid as result_id
        from computed
    )
    insert into stg_results (
        result_id, student_id, subject_id, exam_id, omr_scan_id, subjective_id, total, grade, status, approval_date
    )
    select
        result_id,
        student_id,
        subject_id,
        final_2025_exam_id,
        omr_scan_id,
        subjective_id,
        total_mark,
        case
            when grade_level >= 4 and total_mark >= 90 then 'A+'
            when grade_level >= 4 and total_mark >= 80 then 'A'
            when grade_level >= 4 and total_mark >= 70 then 'A-'
            when grade_level >= 4 and total_mark >= 65 then 'B+'
            when grade_level >= 4 and total_mark >= 60 then 'B'
            when grade_level >= 4 and total_mark >= 55 then 'C+'
            when grade_level >= 4 and total_mark >= 50 then 'C'
            when grade_level >= 4 and total_mark >= 45 then 'D'
            when grade_level >= 4 and total_mark >= 40 then 'E'
            when grade_level >= 4 then 'G'
            when total_mark >= 80 then 'A'
            when total_mark >= 65 then 'B'
            when total_mark >= 50 then 'C'
            when total_mark >= 40 then 'D'
            else 'E'
        end,
        'approved',
        '2025-11-28'::date
    from ids
    on conflict (result_id) do update set
        student_id = excluded.student_id,
        subject_id = excluded.subject_id,
        exam_id = excluded.exam_id,
        omr_scan_id = excluded.omr_scan_id,
        subjective_id = excluded.subjective_id,
        total = excluded.total,
        grade = excluded.grade,
        status = excluded.status,
        approval_date = excluded.approval_date;
end $$;
