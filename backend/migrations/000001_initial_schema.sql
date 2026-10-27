--
-- PostgreSQL database dump
--


-- Dumped from database version 16.14
-- Dumped by pg_dump version 16.14

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: action5_w2_hs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.action5_w2_hs (
    id bigint NOT NULL,
    tenant_id bigint NOT NULL,
    project_id bigint NOT NULL,
    risk_id bigint,
    what text,
    why text,
    "where" character varying(200),
    "when" character varying(40),
    who character varying(160),
    how text,
    how_much character varying(80),
    status character varying(20) DEFAULT 'PLANEJADA'::character varying,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


--
-- Name: action5_w2_hs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.action5_w2_hs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: action5_w2_hs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.action5_w2_hs_id_seq OWNED BY public.action5_w2_hs.id;


--
-- Name: activities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.activities (
    id bigint NOT NULL,
    tenant_id bigint NOT NULL,
    project_id bigint NOT NULL,
    title character varying(200) NOT NULL,
    description text,
    status character varying(32) DEFAULT 'NAO_INICIADA'::character varying,
    planned_start timestamp with time zone,
    planned_end timestamp with time zone,
    real_start timestamp with time zone,
    real_end timestamp with time zone,
    "order" bigint DEFAULT 0,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone
);


--
-- Name: activities_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.activities_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: activities_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.activities_id_seq OWNED BY public.activities.id;


--
-- Name: activity_dependencies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.activity_dependencies (
    id bigint NOT NULL,
    tenant_id bigint NOT NULL,
    project_id bigint NOT NULL,
    predecessor_id bigint NOT NULL,
    successor_id bigint NOT NULL,
    created_at timestamp with time zone
);


--
-- Name: activity_dependencies_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.activity_dependencies_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: activity_dependencies_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.activity_dependencies_id_seq OWNED BY public.activity_dependencies.id;


--
-- Name: attachments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.attachments (
    id bigint NOT NULL,
    tenant_id bigint NOT NULL,
    project_id bigint NOT NULL,
    name character varying(255) NOT NULL,
    stored_name character varying(255) NOT NULL,
    mime_type character varying(120),
    size bigint,
    uploaded_by_id bigint,
    created_at timestamp with time zone,
    activity_id bigint,
    category character varying(60),
    description character varying(400),
    version bigint DEFAULT 1,
    expires_at timestamp with time zone
);


--
-- Name: attachments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.attachments_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: attachments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.attachments_id_seq OWNED BY public.attachments.id;


--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_logs (
    id bigint NOT NULL,
    tenant_id bigint NOT NULL,
    user_id bigint,
    user_name character varying(160),
    action character varying(60),
    entity character varying(40),
    entity_id bigint,
    details text,
    ip character varying(60),
    created_at timestamp with time zone
);


--
-- Name: audit_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.audit_logs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: audit_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.audit_logs_id_seq OWNED BY public.audit_logs.id;


--
-- Name: budget_lines; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.budget_lines (
    id bigint NOT NULL,
    tenant_id bigint NOT NULL,
    project_id bigint NOT NULL,
    code character varying(60) NOT NULL,
    description character varying(200),
    source character varying(80),
    planned numeric DEFAULT 0,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


--
-- Name: budget_lines_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.budget_lines_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: budget_lines_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.budget_lines_id_seq OWNED BY public.budget_lines.id;


--
-- Name: cargos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cargos (
    id bigint NOT NULL,
    tenant_id bigint NOT NULL,
    name character varying(80) NOT NULL,
    description character varying(200),
    active boolean DEFAULT true,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


--
-- Name: cargos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.cargos_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: cargos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.cargos_id_seq OWNED BY public.cargos.id;


--
-- Name: commitments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.commitments (
    id bigint NOT NULL,
    tenant_id bigint NOT NULL,
    project_id bigint NOT NULL,
    budget_line_id bigint,
    supplier_id bigint,
    number character varying(80),
    description text,
    amount numeric DEFAULT 0,
    status character varying(20) DEFAULT 'EMPENHADO'::character varying,
    issued_at timestamp with time zone,
    created_by_id bigint,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


--
-- Name: commitments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.commitments_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: commitments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.commitments_id_seq OWNED BY public.commitments.id;


--
-- Name: contracts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.contracts (
    id bigint NOT NULL,
    tenant_id bigint NOT NULL,
    project_id bigint NOT NULL,
    commitment_id bigint,
    supplier_id bigint,
    parent_id bigint,
    number character varying(80) NOT NULL,
    object text,
    value numeric DEFAULT 0,
    status character varying(20) DEFAULT 'VIGENTE'::character varying,
    start_date timestamp with time zone,
    end_date timestamp with time zone,
    signed_at timestamp with time zone,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


--
-- Name: contracts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.contracts_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: contracts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.contracts_id_seq OWNED BY public.contracts.id;


--
-- Name: deadline_changes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.deadline_changes (
    id bigint NOT NULL,
    tenant_id bigint NOT NULL,
    project_id bigint NOT NULL,
    entity_type character varying(20),
    entity_id bigint,
    entity_name character varying(200),
    field character varying(40),
    old_value character varying(40),
    new_value character varying(40),
    justification text,
    changed_by_id bigint,
    created_at timestamp with time zone
);


--
-- Name: deadline_changes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.deadline_changes_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: deadline_changes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.deadline_changes_id_seq OWNED BY public.deadline_changes.id;


--
-- Name: lessons; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lessons (
    id bigint NOT NULL,
    tenant_id bigint NOT NULL,
    project_id bigint NOT NULL,
    title character varying(200) NOT NULL,
    description text,
    category character varying(40),
    created_by_id bigint,
    created_at timestamp with time zone
);


--
-- Name: lessons_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.lessons_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: lessons_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.lessons_id_seq OWNED BY public.lessons.id;


--
-- Name: milestones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.milestones (
    id bigint NOT NULL,
    tenant_id bigint NOT NULL,
    project_id bigint NOT NULL,
    name character varying(180) NOT NULL,
    description text,
    due_date timestamp with time zone,
    status character varying(20) DEFAULT 'PENDENTE'::character varying,
    completed_at timestamp with time zone,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


--
-- Name: milestones_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.milestones_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: milestones_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.milestones_id_seq OWNED BY public.milestones.id;


--
-- Name: notification_deliveries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notification_deliveries (
    id bigint NOT NULL,
    tenant_id bigint NOT NULL,
    notification_id bigint NOT NULL,
    user_id bigint,
    channel character varying(20),
    status character varying(20),
    error text,
    created_at timestamp with time zone
);


--
-- Name: notification_deliveries_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.notification_deliveries_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: notification_deliveries_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.notification_deliveries_id_seq OWNED BY public.notification_deliveries.id;


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id bigint NOT NULL,
    tenant_id bigint NOT NULL,
    user_id bigint NOT NULL,
    title character varying(200),
    message text,
    type character varying(40),
    link character varying(255),
    read_at timestamp with time zone,
    created_at timestamp with time zone
);


--
-- Name: notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.notifications_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.notifications_id_seq OWNED BY public.notifications.id;


--
-- Name: payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payments (
    id bigint NOT NULL,
    tenant_id bigint NOT NULL,
    project_id bigint NOT NULL,
    commitment_id bigint NOT NULL,
    amount numeric DEFAULT 0,
    paid_at timestamp with time zone,
    note character varying(200),
    created_by_id bigint,
    created_at timestamp with time zone
);


--
-- Name: payments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.payments_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: payments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.payments_id_seq OWNED BY public.payments.id;


--
-- Name: project_approvals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.project_approvals (
    id bigint NOT NULL,
    tenant_id bigint NOT NULL,
    project_id bigint NOT NULL,
    stage character varying(30) NOT NULL,
    status character varying(20) DEFAULT 'PENDENTE'::character varying,
    comment text,
    signature character varying(160),
    approver_id bigint,
    decided_at timestamp with time zone,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


--
-- Name: project_approvals_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.project_approvals_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: project_approvals_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.project_approvals_id_seq OWNED BY public.project_approvals.id;


--
-- Name: project_documents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.project_documents (
    id bigint NOT NULL,
    tenant_id bigint NOT NULL,
    project_id bigint NOT NULL,
    name character varying(180) NOT NULL,
    category character varying(60),
    required boolean DEFAULT false,
    status character varying(20) DEFAULT 'PENDENTE'::character varying,
    attachment_id bigint,
    note text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


--
-- Name: project_documents_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.project_documents_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: project_documents_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.project_documents_id_seq OWNED BY public.project_documents.id;


--
-- Name: project_indicators; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.project_indicators (
    id bigint NOT NULL,
    tenant_id bigint NOT NULL,
    project_id bigint NOT NULL,
    name character varying(180) NOT NULL,
    unit character varying(30),
    target numeric DEFAULT 0,
    current numeric DEFAULT 0,
    notes text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


--
-- Name: project_indicators_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.project_indicators_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: project_indicators_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.project_indicators_id_seq OWNED BY public.project_indicators.id;


--
-- Name: project_secretariats; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.project_secretariats (
    project_id bigint NOT NULL,
    secretariat_id bigint NOT NULL
);


--
-- Name: project_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.project_templates (
    id bigint NOT NULL,
    tenant_id bigint NOT NULL,
    name character varying(180) NOT NULL,
    description text,
    priority character varying(16) DEFAULT 'MEDIA'::character varying,
    duration_days bigint DEFAULT 90,
    activities text,
    active boolean DEFAULT true,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


--
-- Name: project_templates_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.project_templates_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: project_templates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.project_templates_id_seq OWNED BY public.project_templates.id;


--
-- Name: project_transfers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.project_transfers (
    id bigint NOT NULL,
    tenant_id bigint NOT NULL,
    project_id bigint NOT NULL,
    from_secretariat_id bigint,
    to_secretariat_id bigint,
    changed_by_id bigint,
    note text,
    created_at timestamp with time zone
);


--
-- Name: project_transfers_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.project_transfers_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: project_transfers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.project_transfers_id_seq OWNED BY public.project_transfers.id;


--
-- Name: projects; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.projects (
    id bigint NOT NULL,
    tenant_id bigint NOT NULL,
    code character varying(32),
    name character varying(200) NOT NULL,
    justification text,
    objectives text,
    requirements text,
    risk_assessment text,
    government_plan boolean DEFAULT false,
    government_plan_detail text,
    priority character varying(16) DEFAULT 'MEDIA'::character varying,
    status character varying(32) DEFAULT 'NAO_INICIADO'::character varying,
    responsible_secretariat_id bigint NOT NULL,
    planned_start timestamp with time zone,
    planned_end timestamp with time zone,
    real_start timestamp with time zone,
    real_end timestamp with time zone,
    budget_planned numeric DEFAULT 0,
    budget_executed numeric DEFAULT 0,
    created_by_id bigint,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    baseline_start timestamp with time zone,
    baseline_end timestamp with time zone,
    baseline_budget numeric DEFAULT 0,
    ppa character varying(80),
    ldo character varying(80),
    loa character varying(80),
    template_id bigint
);


--
-- Name: projects_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.projects_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: projects_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.projects_id_seq OWNED BY public.projects.id;


--
-- Name: report_schedules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.report_schedules (
    id bigint NOT NULL,
    tenant_id bigint NOT NULL,
    user_id bigint NOT NULL,
    name character varying(120) NOT NULL,
    frequency character varying(20) DEFAULT 'WEEKLY'::character varying,
    filters text,
    active boolean DEFAULT true,
    next_run timestamp with time zone,
    last_run timestamp with time zone,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


--
-- Name: report_schedules_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.report_schedules_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: report_schedules_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.report_schedules_id_seq OWNED BY public.report_schedules.id;


--
-- Name: risks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.risks (
    id bigint NOT NULL,
    tenant_id bigint NOT NULL,
    project_id bigint NOT NULL,
    description text NOT NULL,
    category character varying(40),
    gravity bigint DEFAULT 1,
    urgency bigint DEFAULT 1,
    tendency bigint DEFAULT 1,
    score bigint DEFAULT 1,
    level character varying(20),
    status character varying(20) DEFAULT 'ABERTO'::character varying,
    response text,
    owner character varying(120),
    created_by_id bigint,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


--
-- Name: risks_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.risks_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: risks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.risks_id_seq OWNED BY public.risks.id;


--
-- Name: saved_reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.saved_reports (
    id bigint NOT NULL,
    tenant_id bigint NOT NULL,
    user_id bigint NOT NULL,
    name character varying(120) NOT NULL,
    filters text,
    created_at timestamp with time zone
);


--
-- Name: saved_reports_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.saved_reports_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: saved_reports_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.saved_reports_id_seq OWNED BY public.saved_reports.id;


--
-- Name: secretariats; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.secretariats (
    id bigint NOT NULL,
    tenant_id bigint NOT NULL,
    name character varying(160) NOT NULL,
    acronym character varying(24),
    color character varying(16),
    active boolean DEFAULT true,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


--
-- Name: secretariats_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.secretariats_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: secretariats_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.secretariats_id_seq OWNED BY public.secretariats.id;


--
-- Name: stakeholders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stakeholders (
    id bigint NOT NULL,
    tenant_id bigint NOT NULL,
    project_id bigint NOT NULL,
    name character varying(180) NOT NULL,
    kind character varying(40) DEFAULT 'EQUIPE'::character varying,
    organization character varying(180),
    email character varying(160),
    phone character varying(40),
    role character varying(120),
    influence bigint DEFAULT 3,
    interest bigint DEFAULT 3,
    notes text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


--
-- Name: stakeholders_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.stakeholders_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: stakeholders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.stakeholders_id_seq OWNED BY public.stakeholders.id;


--
-- Name: suppliers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.suppliers (
    id bigint NOT NULL,
    tenant_id bigint NOT NULL,
    name character varying(180) NOT NULL,
    document character varying(30),
    category character varying(60),
    email character varying(160),
    phone character varying(40),
    active boolean DEFAULT true,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


--
-- Name: suppliers_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.suppliers_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: suppliers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.suppliers_id_seq OWNED BY public.suppliers.id;


--
-- Name: swot_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.swot_items (
    id bigint NOT NULL,
    tenant_id bigint NOT NULL,
    project_id bigint NOT NULL,
    quadrant character varying(20) NOT NULL,
    description text NOT NULL,
    created_by_id bigint,
    created_at timestamp with time zone
);


--
-- Name: swot_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.swot_items_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: swot_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.swot_items_id_seq OWNED BY public.swot_items.id;


--
-- Name: tenants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tenants (
    id bigint NOT NULL,
    name character varying(160) NOT NULL,
    slug character varying(80) NOT NULL,
    city character varying(120),
    state character varying(2),
    active boolean DEFAULT true,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    primary_color character varying(16) DEFAULT '#123b33'::character varying,
    secondary_color character varying(16) DEFAULT '#c8a34a'::character varying
);


--
-- Name: tenants_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.tenants_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: tenants_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.tenants_id_seq OWNED BY public.tenants.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id bigint NOT NULL,
    tenant_id bigint NOT NULL,
    secretariat_id bigint,
    cargo_id bigint,
    name character varying(160) NOT NULL,
    email character varying(160) NOT NULL,
    password_hash character varying(255) NOT NULL,
    role character varying(20) NOT NULL,
    active boolean DEFAULT true,
    last_login_at timestamp with time zone,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    failed_attempts bigint DEFAULT 0,
    locked_until timestamp with time zone,
    permissions text,
    phone character varying(40),
    notify_email boolean DEFAULT true,
    notify_whats_app boolean DEFAULT false
);


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: action5_w2_hs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.action5_w2_hs ALTER COLUMN id SET DEFAULT nextval('public.action5_w2_hs_id_seq'::regclass);


--
-- Name: activities id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activities ALTER COLUMN id SET DEFAULT nextval('public.activities_id_seq'::regclass);


--
-- Name: activity_dependencies id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_dependencies ALTER COLUMN id SET DEFAULT nextval('public.activity_dependencies_id_seq'::regclass);


--
-- Name: attachments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attachments ALTER COLUMN id SET DEFAULT nextval('public.attachments_id_seq'::regclass);


--
-- Name: audit_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs ALTER COLUMN id SET DEFAULT nextval('public.audit_logs_id_seq'::regclass);


--
-- Name: budget_lines id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.budget_lines ALTER COLUMN id SET DEFAULT nextval('public.budget_lines_id_seq'::regclass);


--
-- Name: cargos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cargos ALTER COLUMN id SET DEFAULT nextval('public.cargos_id_seq'::regclass);


--
-- Name: commitments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.commitments ALTER COLUMN id SET DEFAULT nextval('public.commitments_id_seq'::regclass);


--
-- Name: contracts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contracts ALTER COLUMN id SET DEFAULT nextval('public.contracts_id_seq'::regclass);


--
-- Name: deadline_changes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deadline_changes ALTER COLUMN id SET DEFAULT nextval('public.deadline_changes_id_seq'::regclass);


--
-- Name: lessons id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lessons ALTER COLUMN id SET DEFAULT nextval('public.lessons_id_seq'::regclass);


--
-- Name: milestones id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.milestones ALTER COLUMN id SET DEFAULT nextval('public.milestones_id_seq'::regclass);


--
-- Name: notification_deliveries id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_deliveries ALTER COLUMN id SET DEFAULT nextval('public.notification_deliveries_id_seq'::regclass);


--
-- Name: notifications id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications ALTER COLUMN id SET DEFAULT nextval('public.notifications_id_seq'::regclass);


--
-- Name: payments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments ALTER COLUMN id SET DEFAULT nextval('public.payments_id_seq'::regclass);


--
-- Name: project_approvals id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_approvals ALTER COLUMN id SET DEFAULT nextval('public.project_approvals_id_seq'::regclass);


--
-- Name: project_documents id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_documents ALTER COLUMN id SET DEFAULT nextval('public.project_documents_id_seq'::regclass);


--
-- Name: project_indicators id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_indicators ALTER COLUMN id SET DEFAULT nextval('public.project_indicators_id_seq'::regclass);


--
-- Name: project_templates id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_templates ALTER COLUMN id SET DEFAULT nextval('public.project_templates_id_seq'::regclass);


--
-- Name: project_transfers id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_transfers ALTER COLUMN id SET DEFAULT nextval('public.project_transfers_id_seq'::regclass);


--
-- Name: projects id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects ALTER COLUMN id SET DEFAULT nextval('public.projects_id_seq'::regclass);


--
-- Name: report_schedules id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_schedules ALTER COLUMN id SET DEFAULT nextval('public.report_schedules_id_seq'::regclass);


--
-- Name: risks id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.risks ALTER COLUMN id SET DEFAULT nextval('public.risks_id_seq'::regclass);


--
-- Name: saved_reports id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.saved_reports ALTER COLUMN id SET DEFAULT nextval('public.saved_reports_id_seq'::regclass);


--
-- Name: secretariats id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.secretariats ALTER COLUMN id SET DEFAULT nextval('public.secretariats_id_seq'::regclass);


--
-- Name: stakeholders id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stakeholders ALTER COLUMN id SET DEFAULT nextval('public.stakeholders_id_seq'::regclass);


--
-- Name: suppliers id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.suppliers ALTER COLUMN id SET DEFAULT nextval('public.suppliers_id_seq'::regclass);


--
-- Name: swot_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.swot_items ALTER COLUMN id SET DEFAULT nextval('public.swot_items_id_seq'::regclass);


--
-- Name: tenants id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenants ALTER COLUMN id SET DEFAULT nextval('public.tenants_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: action5_w2_hs action5_w2_hs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.action5_w2_hs
    ADD CONSTRAINT action5_w2_hs_pkey PRIMARY KEY (id);


--
-- Name: activities activities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activities
    ADD CONSTRAINT activities_pkey PRIMARY KEY (id);


--
-- Name: activity_dependencies activity_dependencies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_dependencies
    ADD CONSTRAINT activity_dependencies_pkey PRIMARY KEY (id);


--
-- Name: attachments attachments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attachments
    ADD CONSTRAINT attachments_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: budget_lines budget_lines_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.budget_lines
    ADD CONSTRAINT budget_lines_pkey PRIMARY KEY (id);


--
-- Name: cargos cargos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cargos
    ADD CONSTRAINT cargos_pkey PRIMARY KEY (id);


--
-- Name: commitments commitments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.commitments
    ADD CONSTRAINT commitments_pkey PRIMARY KEY (id);


--
-- Name: contracts contracts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contracts
    ADD CONSTRAINT contracts_pkey PRIMARY KEY (id);


--
-- Name: deadline_changes deadline_changes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deadline_changes
    ADD CONSTRAINT deadline_changes_pkey PRIMARY KEY (id);


--
-- Name: lessons lessons_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lessons
    ADD CONSTRAINT lessons_pkey PRIMARY KEY (id);


--
-- Name: milestones milestones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.milestones
    ADD CONSTRAINT milestones_pkey PRIMARY KEY (id);


--
-- Name: notification_deliveries notification_deliveries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_deliveries
    ADD CONSTRAINT notification_deliveries_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- Name: project_approvals project_approvals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_approvals
    ADD CONSTRAINT project_approvals_pkey PRIMARY KEY (id);


--
-- Name: project_documents project_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_documents
    ADD CONSTRAINT project_documents_pkey PRIMARY KEY (id);


--
-- Name: project_indicators project_indicators_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_indicators
    ADD CONSTRAINT project_indicators_pkey PRIMARY KEY (id);


--
-- Name: project_secretariats project_secretariats_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_secretariats
    ADD CONSTRAINT project_secretariats_pkey PRIMARY KEY (project_id, secretariat_id);


--
-- Name: project_templates project_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_templates
    ADD CONSTRAINT project_templates_pkey PRIMARY KEY (id);


--
-- Name: project_transfers project_transfers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_transfers
    ADD CONSTRAINT project_transfers_pkey PRIMARY KEY (id);


--
-- Name: projects projects_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_pkey PRIMARY KEY (id);


--
-- Name: report_schedules report_schedules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_schedules
    ADD CONSTRAINT report_schedules_pkey PRIMARY KEY (id);


--
-- Name: risks risks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.risks
    ADD CONSTRAINT risks_pkey PRIMARY KEY (id);


--
-- Name: saved_reports saved_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.saved_reports
    ADD CONSTRAINT saved_reports_pkey PRIMARY KEY (id);


--
-- Name: secretariats secretariats_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.secretariats
    ADD CONSTRAINT secretariats_pkey PRIMARY KEY (id);


--
-- Name: stakeholders stakeholders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stakeholders
    ADD CONSTRAINT stakeholders_pkey PRIMARY KEY (id);


--
-- Name: suppliers suppliers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.suppliers
    ADD CONSTRAINT suppliers_pkey PRIMARY KEY (id);


--
-- Name: swot_items swot_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.swot_items
    ADD CONSTRAINT swot_items_pkey PRIMARY KEY (id);


--
-- Name: tenants tenants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT tenants_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: idx_action5_w2_hs_project_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_action5_w2_hs_project_id ON public.action5_w2_hs USING btree (project_id);


--
-- Name: idx_action5_w2_hs_risk_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_action5_w2_hs_risk_id ON public.action5_w2_hs USING btree (risk_id);


--
-- Name: idx_action5_w2_hs_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_action5_w2_hs_tenant_id ON public.action5_w2_hs USING btree (tenant_id);


--
-- Name: idx_activities_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activities_deleted_at ON public.activities USING btree (deleted_at);


--
-- Name: idx_activities_project_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activities_project_id ON public.activities USING btree (project_id);


--
-- Name: idx_activities_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activities_tenant_id ON public.activities USING btree (tenant_id);


--
-- Name: idx_activity_dependencies_predecessor_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activity_dependencies_predecessor_id ON public.activity_dependencies USING btree (predecessor_id);


--
-- Name: idx_activity_dependencies_project_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activity_dependencies_project_id ON public.activity_dependencies USING btree (project_id);


--
-- Name: idx_activity_dependencies_successor_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activity_dependencies_successor_id ON public.activity_dependencies USING btree (successor_id);


--
-- Name: idx_activity_dependencies_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activity_dependencies_tenant_id ON public.activity_dependencies USING btree (tenant_id);


--
-- Name: idx_attachments_activity_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_attachments_activity_id ON public.attachments USING btree (activity_id);


--
-- Name: idx_attachments_project_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_attachments_project_id ON public.attachments USING btree (project_id);


--
-- Name: idx_attachments_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_attachments_tenant_id ON public.attachments USING btree (tenant_id);


--
-- Name: idx_audit_logs_action; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_action ON public.audit_logs USING btree (action);


--
-- Name: idx_audit_logs_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_entity ON public.audit_logs USING btree (entity);


--
-- Name: idx_audit_logs_entity_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_entity_id ON public.audit_logs USING btree (entity_id);


--
-- Name: idx_audit_logs_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_tenant_id ON public.audit_logs USING btree (tenant_id);


--
-- Name: idx_audit_logs_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_user_id ON public.audit_logs USING btree (user_id);


--
-- Name: idx_budget_lines_project_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_budget_lines_project_id ON public.budget_lines USING btree (project_id);


--
-- Name: idx_budget_lines_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_budget_lines_tenant_id ON public.budget_lines USING btree (tenant_id);


--
-- Name: idx_cargos_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cargos_tenant_id ON public.cargos USING btree (tenant_id);


--
-- Name: idx_commitments_budget_line_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_commitments_budget_line_id ON public.commitments USING btree (budget_line_id);


--
-- Name: idx_commitments_project_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_commitments_project_id ON public.commitments USING btree (project_id);


--
-- Name: idx_commitments_supplier_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_commitments_supplier_id ON public.commitments USING btree (supplier_id);


--
-- Name: idx_commitments_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_commitments_tenant_id ON public.commitments USING btree (tenant_id);


--
-- Name: idx_contracts_commitment_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contracts_commitment_id ON public.contracts USING btree (commitment_id);


--
-- Name: idx_contracts_parent_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contracts_parent_id ON public.contracts USING btree (parent_id);


--
-- Name: idx_contracts_project_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contracts_project_id ON public.contracts USING btree (project_id);


--
-- Name: idx_contracts_supplier_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contracts_supplier_id ON public.contracts USING btree (supplier_id);


--
-- Name: idx_contracts_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contracts_tenant_id ON public.contracts USING btree (tenant_id);


--
-- Name: idx_deadline_changes_project_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_deadline_changes_project_id ON public.deadline_changes USING btree (project_id);


--
-- Name: idx_deadline_changes_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_deadline_changes_tenant_id ON public.deadline_changes USING btree (tenant_id);


--
-- Name: idx_lessons_project_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lessons_project_id ON public.lessons USING btree (project_id);


--
-- Name: idx_lessons_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lessons_tenant_id ON public.lessons USING btree (tenant_id);


--
-- Name: idx_milestones_project_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_milestones_project_id ON public.milestones USING btree (project_id);


--
-- Name: idx_milestones_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_milestones_tenant_id ON public.milestones USING btree (tenant_id);


--
-- Name: idx_notification_deliveries_notification_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notification_deliveries_notification_id ON public.notification_deliveries USING btree (notification_id);


--
-- Name: idx_notification_deliveries_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notification_deliveries_tenant_id ON public.notification_deliveries USING btree (tenant_id);


--
-- Name: idx_notification_deliveries_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notification_deliveries_user_id ON public.notification_deliveries USING btree (user_id);


--
-- Name: idx_notifications_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_tenant_id ON public.notifications USING btree (tenant_id);


--
-- Name: idx_notifications_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_user_id ON public.notifications USING btree (user_id);


--
-- Name: idx_payments_commitment_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payments_commitment_id ON public.payments USING btree (commitment_id);


--
-- Name: idx_payments_project_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payments_project_id ON public.payments USING btree (project_id);


--
-- Name: idx_payments_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payments_tenant_id ON public.payments USING btree (tenant_id);


--
-- Name: idx_project_approvals_approver_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_project_approvals_approver_id ON public.project_approvals USING btree (approver_id);


--
-- Name: idx_project_approvals_project_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_project_approvals_project_id ON public.project_approvals USING btree (project_id);


--
-- Name: idx_project_approvals_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_project_approvals_tenant_id ON public.project_approvals USING btree (tenant_id);


--
-- Name: idx_project_documents_attachment_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_project_documents_attachment_id ON public.project_documents USING btree (attachment_id);


--
-- Name: idx_project_documents_project_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_project_documents_project_id ON public.project_documents USING btree (project_id);


--
-- Name: idx_project_documents_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_project_documents_tenant_id ON public.project_documents USING btree (tenant_id);


--
-- Name: idx_project_indicators_project_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_project_indicators_project_id ON public.project_indicators USING btree (project_id);


--
-- Name: idx_project_indicators_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_project_indicators_tenant_id ON public.project_indicators USING btree (tenant_id);


--
-- Name: idx_project_templates_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_project_templates_tenant_id ON public.project_templates USING btree (tenant_id);


--
-- Name: idx_project_transfers_project_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_project_transfers_project_id ON public.project_transfers USING btree (project_id);


--
-- Name: idx_project_transfers_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_project_transfers_tenant_id ON public.project_transfers USING btree (tenant_id);


--
-- Name: idx_projects_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_projects_code ON public.projects USING btree (code);


--
-- Name: idx_projects_created_by_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_projects_created_by_id ON public.projects USING btree (created_by_id);


--
-- Name: idx_projects_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_projects_deleted_at ON public.projects USING btree (deleted_at);


--
-- Name: idx_projects_responsible_secretariat_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_projects_responsible_secretariat_id ON public.projects USING btree (responsible_secretariat_id);


--
-- Name: idx_projects_template_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_projects_template_id ON public.projects USING btree (template_id);


--
-- Name: idx_projects_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_projects_tenant_id ON public.projects USING btree (tenant_id);


--
-- Name: idx_report_schedules_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_report_schedules_tenant_id ON public.report_schedules USING btree (tenant_id);


--
-- Name: idx_report_schedules_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_report_schedules_user_id ON public.report_schedules USING btree (user_id);


--
-- Name: idx_risks_project_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_risks_project_id ON public.risks USING btree (project_id);


--
-- Name: idx_risks_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_risks_tenant_id ON public.risks USING btree (tenant_id);


--
-- Name: idx_saved_reports_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_saved_reports_tenant_id ON public.saved_reports USING btree (tenant_id);


--
-- Name: idx_saved_reports_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_saved_reports_user_id ON public.saved_reports USING btree (user_id);


--
-- Name: idx_secretariats_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_secretariats_tenant_id ON public.secretariats USING btree (tenant_id);


--
-- Name: idx_stakeholders_project_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stakeholders_project_id ON public.stakeholders USING btree (project_id);


--
-- Name: idx_stakeholders_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stakeholders_tenant_id ON public.stakeholders USING btree (tenant_id);


--
-- Name: idx_suppliers_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_suppliers_tenant_id ON public.suppliers USING btree (tenant_id);


--
-- Name: idx_swot_items_project_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_swot_items_project_id ON public.swot_items USING btree (project_id);


--
-- Name: idx_swot_items_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_swot_items_tenant_id ON public.swot_items USING btree (tenant_id);


--
-- Name: idx_tenants_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_tenants_slug ON public.tenants USING btree (slug);


--
-- Name: idx_user_tenant_email; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_user_tenant_email ON public.users USING btree (tenant_id, email);


--
-- Name: idx_users_cargo_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_cargo_id ON public.users USING btree (cargo_id);


--
-- Name: idx_users_secretariat_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_secretariat_id ON public.users USING btree (secretariat_id);


--
-- Name: attachments fk_attachments_uploaded_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attachments
    ADD CONSTRAINT fk_attachments_uploaded_by FOREIGN KEY (uploaded_by_id) REFERENCES public.users(id);


--
-- Name: commitments fk_commitments_budget_line; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.commitments
    ADD CONSTRAINT fk_commitments_budget_line FOREIGN KEY (budget_line_id) REFERENCES public.budget_lines(id);


--
-- Name: contracts fk_commitments_contract; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contracts
    ADD CONSTRAINT fk_commitments_contract FOREIGN KEY (commitment_id) REFERENCES public.commitments(id);


--
-- Name: payments fk_commitments_payments; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT fk_commitments_payments FOREIGN KEY (commitment_id) REFERENCES public.commitments(id);


--
-- Name: commitments fk_commitments_supplier; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.commitments
    ADD CONSTRAINT fk_commitments_supplier FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id);


--
-- Name: contracts fk_contracts_supplier; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contracts
    ADD CONSTRAINT fk_contracts_supplier FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id);


--
-- Name: deadline_changes fk_deadline_changes_changed_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deadline_changes
    ADD CONSTRAINT fk_deadline_changes_changed_by FOREIGN KEY (changed_by_id) REFERENCES public.users(id);


--
-- Name: lessons fk_lessons_created_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lessons
    ADD CONSTRAINT fk_lessons_created_by FOREIGN KEY (created_by_id) REFERENCES public.users(id);


--
-- Name: lessons fk_lessons_project; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lessons
    ADD CONSTRAINT fk_lessons_project FOREIGN KEY (project_id) REFERENCES public.projects(id);


--
-- Name: project_approvals fk_project_approvals_approver; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_approvals
    ADD CONSTRAINT fk_project_approvals_approver FOREIGN KEY (approver_id) REFERENCES public.users(id);


--
-- Name: project_documents fk_project_documents_attachment; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_documents
    ADD CONSTRAINT fk_project_documents_attachment FOREIGN KEY (attachment_id) REFERENCES public.attachments(id);


--
-- Name: project_secretariats fk_project_secretariats_project; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_secretariats
    ADD CONSTRAINT fk_project_secretariats_project FOREIGN KEY (project_id) REFERENCES public.projects(id);


--
-- Name: project_secretariats fk_project_secretariats_secretariat; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_secretariats
    ADD CONSTRAINT fk_project_secretariats_secretariat FOREIGN KEY (secretariat_id) REFERENCES public.secretariats(id);


--
-- Name: project_transfers fk_project_transfers_changed_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_transfers
    ADD CONSTRAINT fk_project_transfers_changed_by FOREIGN KEY (changed_by_id) REFERENCES public.users(id);


--
-- Name: project_transfers fk_project_transfers_from_secretariat; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_transfers
    ADD CONSTRAINT fk_project_transfers_from_secretariat FOREIGN KEY (from_secretariat_id) REFERENCES public.secretariats(id);


--
-- Name: project_transfers fk_project_transfers_to_secretariat; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_transfers
    ADD CONSTRAINT fk_project_transfers_to_secretariat FOREIGN KEY (to_secretariat_id) REFERENCES public.secretariats(id);


--
-- Name: projects fk_projects_created_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT fk_projects_created_by FOREIGN KEY (created_by_id) REFERENCES public.users(id);


--
-- Name: projects fk_projects_responsible_secretariat; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT fk_projects_responsible_secretariat FOREIGN KEY (responsible_secretariat_id) REFERENCES public.secretariats(id);


--
-- Name: users fk_users_cargo; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT fk_users_cargo FOREIGN KEY (cargo_id) REFERENCES public.cargos(id);


--
-- Name: users fk_users_secretariat; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT fk_users_secretariat FOREIGN KEY (secretariat_id) REFERENCES public.secretariats(id);


--
-- PostgreSQL database dump complete
--


