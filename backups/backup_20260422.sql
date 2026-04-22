--
-- PostgreSQL database dump
--

\restrict z445HOKMjBkYpgUHHLF2rkTPUR3ncpj1VCVzw04E5jwPE1LsaEnodlXXcfIDEqo

-- Dumped from database version 16.13 (Ubuntu 16.13-0ubuntu0.24.04.1)
-- Dumped by pg_dump version 16.13 (Ubuntu 16.13-0ubuntu0.24.04.1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: rental_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.rental_type AS ENUM (
    'room',
    'floor',
    'entire_unit',
    'entire_house'
);


ALTER TYPE public.rental_type OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: documents; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.documents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    lease_id uuid,
    property_id uuid,
    tenant_id uuid,
    file_name character varying(255) NOT NULL,
    file_url text NOT NULL,
    file_type character varying(50),
    document_type character varying(100) DEFAULT 'lease'::character varying,
    ai_extracted_data jsonb,
    ai_confidence numeric(5,2),
    ai_reviewed boolean DEFAULT false,
    uploaded_at timestamp without time zone DEFAULT now(),
    needs_review boolean DEFAULT false
);


ALTER TABLE public.documents OWNER TO postgres;

--
-- Name: expenses; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.expenses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    property_id uuid NOT NULL,
    unit_id uuid,
    amount numeric(10,2) NOT NULL,
    expense_date date NOT NULL,
    category character varying(100) NOT NULL,
    description text NOT NULL,
    vendor character varying(255),
    receipt_url text,
    is_recurring boolean DEFAULT false,
    tax_deductible boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.expenses OWNER TO postgres;

--
-- Name: invoices; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.invoices (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    lease_id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    property_id uuid NOT NULL,
    amount numeric(10,2) NOT NULL,
    description text NOT NULL,
    category character varying(100) NOT NULL,
    status character varying(50) DEFAULT 'unpaid'::character varying,
    issued_date date DEFAULT CURRENT_DATE NOT NULL,
    due_date date NOT NULL,
    paid_date date,
    receipt_url text,
    notes text,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.invoices OWNER TO postgres;

--
-- Name: leases; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.leases (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    unit_id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    monthly_rent numeric(10,2) NOT NULL,
    security_deposit numeric(10,2) NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    late_fee_amount numeric(10,2) DEFAULT 0,
    late_fee_grace_days integer DEFAULT 5,
    rent_due_day integer DEFAULT 1,
    pet_allowed boolean DEFAULT false,
    pet_deposit numeric(10,2) DEFAULT 0,
    monthly_pet_fee numeric(10,2) DEFAULT 0,
    lease_status character varying(50) DEFAULT 'active'::character varying,
    notes text,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.leases OWNER TO postgres;

--
-- Name: payment_aliases; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.payment_aliases (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    platform character varying(50) NOT NULL,
    handle character varying(255) NOT NULL,
    is_primary boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.payment_aliases OWNER TO postgres;

--
-- Name: payments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.payments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    lease_id uuid NOT NULL,
    amount numeric(10,2) NOT NULL,
    payment_date date NOT NULL,
    due_date date NOT NULL,
    payment_method character varying(50),
    payment_type character varying(50) DEFAULT 'rent'::character varying,
    status character varying(50) DEFAULT 'paid'::character varying,
    late_fee_applied numeric(10,2) DEFAULT 0,
    notes text,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.payments OWNER TO postgres;

--
-- Name: properties; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.properties (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    address text NOT NULL,
    city character varying(100) NOT NULL,
    state character varying(50) NOT NULL,
    zip character varying(20) NOT NULL,
    property_type character varying(50) NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.properties OWNER TO postgres;

--
-- Name: tenants; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tenants (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    first_name character varying(100) NOT NULL,
    last_name character varying(100) NOT NULL,
    email character varying(255) NOT NULL,
    phone character varying(20),
    date_of_birth date,
    move_in_date date,
    id_type character varying(50),
    id_number character varying(100),
    notes text,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.tenants OWNER TO postgres;

--
-- Name: units; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.units (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    property_id uuid NOT NULL,
    unit_number character varying(50) NOT NULL,
    rental_type public.rental_type DEFAULT 'room'::public.rental_type NOT NULL,
    floor_number integer,
    bedrooms integer DEFAULT 1 NOT NULL,
    bathrooms numeric(3,1) DEFAULT 1 NOT NULL,
    square_feet numeric(10,2),
    monthly_rent numeric(10,2) NOT NULL,
    is_occupied boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.units OWNER TO postgres;

--
-- Data for Name: documents; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.documents (id, lease_id, property_id, tenant_id, file_name, file_url, file_type, document_type, ai_extracted_data, ai_confidence, ai_reviewed, uploaded_at, needs_review) FROM stdin;
1fd716c5-1b6a-4480-9934-59dae40f47e8	\N	\N	\N	2nd Floor month to month lease Diana Renee Taylor.docx.pdf	local_upload	\N	lease	{"notes": "Month-to-month lease for up to 12 months. Late fee is waived ($0). Pet deposit and monthly pet fee are both waived. Rent includes utilities but Section 19 clarifies landlord only provides hot/cold water; tenant is responsible for electricity and gas. Parking not included. Max occupancy is 1 person. Tenant must maintain renter's insurance. Sublease requires written landlord consent. 30-day written notice required for early termination by either party. Tenant waives right to jury trial except for personal injury or property damage claims. Security deposit cannot be applied to outstanding rent.", "end_date": "2027-01-27", "confidence": {"dates": 99, "overall": 97, "late_fee": 99, "monthly_rent": 99}, "start_date": "2026-01-27", "pet_allowed": true, "pet_deposit": 0, "tenant_name": "Diana Renee Taylor", "unit_number": "Second Floor Room", "monthly_rent": 800, "rent_due_day": 27, "late_fee_amount": 0, "monthly_pet_fee": 0, "property_address": "1043 West Russell Street Philadelphia, PA 19140", "security_deposit": 200, "utilities_included": ["water (hot and cold)"], "late_fee_grace_days": 5}	97.00	f	2026-04-22 08:15:24.847802	f
\.


--
-- Data for Name: expenses; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.expenses (id, property_id, unit_id, amount, expense_date, category, description, vendor, receipt_url, is_recurring, tax_deductible, created_at) FROM stdin;
\.


--
-- Data for Name: invoices; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.invoices (id, lease_id, tenant_id, property_id, amount, description, category, status, issued_date, due_date, paid_date, receipt_url, notes, created_at) FROM stdin;
\.


--
-- Data for Name: leases; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.leases (id, unit_id, tenant_id, monthly_rent, security_deposit, start_date, end_date, late_fee_amount, late_fee_grace_days, rent_due_day, pet_allowed, pet_deposit, monthly_pet_fee, lease_status, notes, created_at) FROM stdin;
026c7ba7-e7fb-4c32-b56e-787a1a8bab76	db8e493f-e0e1-4fde-adfa-186f4b7c5f67	8c85d46c-d720-407a-8f56-4ef3360c5af8	650.00	1300.00	2026-01-01	2026-12-31	75.00	5	1	f	0.00	0.00	active	\N	2026-04-22 06:57:50.431962
\.


--
-- Data for Name: payment_aliases; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.payment_aliases (id, tenant_id, platform, handle, is_primary, created_at) FROM stdin;
\.


--
-- Data for Name: payments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.payments (id, lease_id, amount, payment_date, due_date, payment_method, payment_type, status, late_fee_applied, notes, created_at) FROM stdin;
19e16ee7-c1b6-4ec6-896e-4cd6f7c2218b	026c7ba7-e7fb-4c32-b56e-787a1a8bab76	650.00	2026-04-22	2026-04-01	cash	rent	paid	75.00		2026-04-22 07:17:09.418864
\.


--
-- Data for Name: properties; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.properties (id, name, address, city, state, zip, property_type, created_at) FROM stdin;
a3b7286c-b304-480d-86e2-9a4bbdcbafff	Oak Street Duplex	123 Oak Street	Reading	PA	19601	residential	2026-04-21 20:47:56.12147
e9504956-d8a0-4aa4-978e-075d347f8b15	Maple Avenue	456 Maple Ave	Reading	PA	19602	residential	2026-04-21 23:16:07.677482
\.


--
-- Data for Name: tenants; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.tenants (id, first_name, last_name, email, phone, date_of_birth, move_in_date, id_type, id_number, notes, created_at) FROM stdin;
8c85d46c-d720-407a-8f56-4ef3360c5af8	Sarah	Mitchell	sarah.mitchell@email.com	610-555-0101	\N	\N	drivers_license	DL123456	Great tenant, always pays on time	2026-04-21 23:20:04.771061
\.


--
-- Data for Name: units; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.units (id, property_id, unit_number, rental_type, floor_number, bedrooms, bathrooms, square_feet, monthly_rent, is_occupied, created_at) FROM stdin;
db8e493f-e0e1-4fde-adfa-186f4b7c5f67	a3b7286c-b304-480d-86e2-9a4bbdcbafff	Room 1	room	\N	1	1.0	\N	650.00	f	2026-04-22 06:09:34.581692
59102089-1f2d-41a4-b012-dcf24a3bdc36	a3b7286c-b304-480d-86e2-9a4bbdcbafff	Room 2	room	\N	1	1.0	\N	625.00	f	2026-04-22 06:11:00.407713
80b68f09-9bf1-4cb3-8dfc-596c4e3cf9c9	e9504956-d8a0-4aa4-978e-075d347f8b15	Unit A	entire_unit	\N	2	1.0	\N	1200.00	f	2026-04-22 06:11:00.409354
\.


--
-- Name: documents documents_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_pkey PRIMARY KEY (id);


--
-- Name: expenses expenses_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_pkey PRIMARY KEY (id);


--
-- Name: invoices invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_pkey PRIMARY KEY (id);


--
-- Name: leases leases_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.leases
    ADD CONSTRAINT leases_pkey PRIMARY KEY (id);


--
-- Name: payment_aliases payment_aliases_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_aliases
    ADD CONSTRAINT payment_aliases_pkey PRIMARY KEY (id);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- Name: properties properties_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.properties
    ADD CONSTRAINT properties_pkey PRIMARY KEY (id);


--
-- Name: tenants tenants_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT tenants_email_key UNIQUE (email);


--
-- Name: tenants tenants_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT tenants_pkey PRIMARY KEY (id);


--
-- Name: units units_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.units
    ADD CONSTRAINT units_pkey PRIMARY KEY (id);


--
-- Name: documents documents_lease_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_lease_id_fkey FOREIGN KEY (lease_id) REFERENCES public.leases(id) ON DELETE CASCADE;


--
-- Name: documents documents_property_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;


--
-- Name: documents documents_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: expenses expenses_property_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;


--
-- Name: expenses expenses_unit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES public.units(id) ON DELETE SET NULL;


--
-- Name: invoices invoices_lease_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_lease_id_fkey FOREIGN KEY (lease_id) REFERENCES public.leases(id) ON DELETE CASCADE;


--
-- Name: invoices invoices_property_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;


--
-- Name: invoices invoices_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: leases leases_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.leases
    ADD CONSTRAINT leases_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: leases leases_unit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.leases
    ADD CONSTRAINT leases_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES public.units(id) ON DELETE CASCADE;


--
-- Name: payment_aliases payment_aliases_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_aliases
    ADD CONSTRAINT payment_aliases_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: payments payments_lease_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_lease_id_fkey FOREIGN KEY (lease_id) REFERENCES public.leases(id) ON DELETE CASCADE;


--
-- Name: units units_property_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.units
    ADD CONSTRAINT units_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict z445HOKMjBkYpgUHHLF2rkTPUR3ncpj1VCVzw04E5jwPE1LsaEnodlXXcfIDEqo

