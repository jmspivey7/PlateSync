--
-- PostgreSQL database dump
--

-- Dumped from database version 16.8
-- Dumped by pg_dump version 16.5

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

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: batches; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.batches (
    id integer NOT NULL,
    name character varying NOT NULL,
    date timestamp without time zone DEFAULT now() NOT NULL,
    status character varying(20) DEFAULT 'OPEN'::character varying NOT NULL,
    total_amount numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    notes text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    church_id character varying,
    service character varying(100),
    primary_attestor_id character varying,
    primary_attestor_name character varying,
    primary_attestation_date timestamp without time zone,
    secondary_attestor_id character varying,
    secondary_attestor_name character varying,
    secondary_attestation_date timestamp without time zone,
    attestation_confirmed_by character varying,
    attestation_confirmation_date timestamp without time zone
);


ALTER TABLE public.batches OWNER TO neondb_owner;

--
-- Name: batches_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.batches_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.batches_id_seq OWNER TO neondb_owner;

--
-- Name: batches_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.batches_id_seq OWNED BY public.batches.id;


--
-- Name: donations; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.donations (
    id integer NOT NULL,
    date timestamp without time zone DEFAULT now() NOT NULL,
    amount numeric(10,2) NOT NULL,
    donation_type character varying(10) NOT NULL,
    check_number character varying(50),
    notes text,
    member_id integer,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    notification_status character varying(20) DEFAULT 'PENDING'::character varying,
    church_id character varying,
    batch_id integer
);


ALTER TABLE public.donations OWNER TO neondb_owner;

--
-- Name: donations_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.donations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.donations_id_seq OWNER TO neondb_owner;

--
-- Name: donations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.donations_id_seq OWNED BY public.donations.id;


--
-- Name: email_templates; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.email_templates (
    id integer NOT NULL,
    template_type character varying(255) NOT NULL,
    subject text NOT NULL,
    body_text text NOT NULL,
    body_html text NOT NULL,
    church_id character varying(255) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.email_templates OWNER TO neondb_owner;

--
-- Name: email_templates_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.email_templates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.email_templates_id_seq OWNER TO neondb_owner;

--
-- Name: email_templates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.email_templates_id_seq OWNED BY public.email_templates.id;


--
-- Name: members; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.members (
    id integer NOT NULL,
    first_name character varying NOT NULL,
    last_name character varying NOT NULL,
    email character varying,
    phone character varying,
    is_visitor boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    notes text,
    church_id character varying,
    external_id character varying(100),
    external_system character varying(50)
);


ALTER TABLE public.members OWNER TO neondb_owner;

--
-- Name: members_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.members_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.members_id_seq OWNER TO neondb_owner;

--
-- Name: members_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.members_id_seq OWNED BY public.members.id;


--
-- Name: planning_center_tokens; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.planning_center_tokens (
    id integer NOT NULL,
    user_id character varying,
    church_id character varying,
    access_token text NOT NULL,
    refresh_token text NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.planning_center_tokens OWNER TO neondb_owner;

--
-- Name: planning_center_tokens_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.planning_center_tokens_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.planning_center_tokens_id_seq OWNER TO neondb_owner;

--
-- Name: planning_center_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.planning_center_tokens_id_seq OWNED BY public.planning_center_tokens.id;


--
-- Name: report_recipients; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.report_recipients (
    id integer NOT NULL,
    first_name character varying NOT NULL,
    last_name character varying NOT NULL,
    email character varying NOT NULL,
    church_id character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.report_recipients OWNER TO neondb_owner;

--
-- Name: report_recipients_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.report_recipients_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.report_recipients_id_seq OWNER TO neondb_owner;

--
-- Name: report_recipients_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.report_recipients_id_seq OWNED BY public.report_recipients.id;


--
-- Name: service_options; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.service_options (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    value character varying(50) NOT NULL,
    is_default boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    church_id character varying
);


ALTER TABLE public.service_options OWNER TO neondb_owner;

--
-- Name: service_options_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.service_options_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.service_options_id_seq OWNER TO neondb_owner;

--
-- Name: service_options_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.service_options_id_seq OWNED BY public.service_options.id;


--
-- Name: sessions; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.sessions (
    sid character varying NOT NULL,
    sess jsonb NOT NULL,
    expire timestamp without time zone NOT NULL
);


ALTER TABLE public.sessions OWNER TO neondb_owner;

--
-- Name: users; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.users (
    id character varying NOT NULL,
    username character varying NOT NULL,
    email character varying,
    first_name character varying,
    last_name character varying,
    bio text,
    profile_image_url character varying,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    church_name character varying,
    email_notifications_enabled boolean DEFAULT true,
    role character varying DEFAULT 'USHER'::character varying NOT NULL,
    password_reset_token character varying,
    password_reset_expires timestamp with time zone,
    password character varying,
    is_verified boolean DEFAULT false,
    church_logo_url character varying,
    church_id character varying,
    is_master_admin boolean DEFAULT false
);


ALTER TABLE public.users OWNER TO neondb_owner;

--
-- Name: batches id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.batches ALTER COLUMN id SET DEFAULT nextval('public.batches_id_seq'::regclass);


--
-- Name: donations id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.donations ALTER COLUMN id SET DEFAULT nextval('public.donations_id_seq'::regclass);


--
-- Name: email_templates id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.email_templates ALTER COLUMN id SET DEFAULT nextval('public.email_templates_id_seq'::regclass);


--
-- Name: members id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.members ALTER COLUMN id SET DEFAULT nextval('public.members_id_seq'::regclass);


--
-- Name: planning_center_tokens id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.planning_center_tokens ALTER COLUMN id SET DEFAULT nextval('public.planning_center_tokens_id_seq'::regclass);


--
-- Name: report_recipients id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.report_recipients ALTER COLUMN id SET DEFAULT nextval('public.report_recipients_id_seq'::regclass);


--
-- Name: service_options id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.service_options ALTER COLUMN id SET DEFAULT nextval('public.service_options_id_seq'::regclass);


--
-- Data for Name: batches; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.batches (id, name, date, status, total_amount, notes, created_at, updated_at, church_id, service, primary_attestor_id, primary_attestor_name, primary_attestation_date, secondary_attestor_id, secondary_attestor_name, secondary_attestation_date, attestation_confirmed_by, attestation_confirmation_date) FROM stdin;
58	Morning Service, April 13, 2025	2025-04-13 00:00:00	FINALIZED	3964.00		2025-05-07 13:46:59.792003	2025-05-07 13:48:23.105	40829937	morning-service	40829937	John Spivey	2025-05-07 13:48:15.755	423399918	Google Usher	2025-05-07 13:48:20.848	40829937	2025-05-07 13:48:23.105
48	Morning Service, February 2, 2025	2025-02-02 00:00:00	FINALIZED	2001.00		2025-05-07 13:34:56.795753	2025-05-07 13:35:56.457	40829937	morning-service	40829937	John Spivey	2025-05-07 13:35:42.409	423399918	Google Usher	2025-05-07 13:35:53.129	40829937	2025-05-07 13:35:56.457
61	Morning Service, April 20, 2025	2025-04-20 00:00:00	FINALIZED	3909.00		2025-05-07 15:08:07.974002	2025-05-07 17:22:59.125	40829937	morning-service	40829937	John Spivey	2025-05-07 17:22:12.252	423399918	Google Usher 	2025-05-07 17:22:33.73	40829937	2025-05-07 17:22:59.125
89	May 8, 2025	2025-05-08 00:00:00	OPEN	0.00		2025-05-08 15:53:08.330162	2025-05-08 15:53:08.330162	644128517		\N	\N	\N	\N	\N	\N	\N	\N
55	Morning Service, March 23, 2025	2025-03-23 00:00:00	FINALIZED	3247.00		2025-05-07 13:43:37.985503	2025-05-07 13:44:25.189	40829937	morning-service	40829937	John Spivey	2025-05-07 13:44:15.82	423399918	Google Usher	2025-05-07 13:44:20.717	40829937	2025-05-07 13:44:25.189
49	Morning Service, February 9, 2025	2025-02-09 00:00:00	FINALIZED	2277.00		2025-05-07 13:36:18.920404	2025-05-07 13:37:12.488	40829937	morning-service	40829937	John Spivey	2025-05-07 13:37:01.144	423399918	Google Usher	2025-05-07 13:37:09.412	40829937	2025-05-07 13:37:12.488
63	Morning Service, April 27, 2025	2025-04-27 00:00:00	FINALIZED	4220.00		2025-05-07 17:26:44.791151	2025-05-07 18:37:38.636	40829937	morning-service	40829937	John Spivey	2025-05-07 18:37:29.43	423399918	Google Usher	2025-05-07 18:37:35.286	40829937	2025-05-07 18:37:38.636
56	Morning Service, March 30, 2025	2025-03-30 00:00:00	FINALIZED	3343.00		2025-05-07 13:44:47.572387	2025-05-07 13:45:38.997	40829937	morning-service	40829937	John Spivey	2025-05-07 13:45:30.19	423399918	Google Usher	2025-05-07 13:45:35.326	40829937	2025-05-07 13:45:38.997
50	Morning Service, February 16, 2025	2025-02-16 00:00:00	FINALIZED	2395.00		2025-05-07 13:37:52.800688	2025-05-07 13:38:29.219	40829937	morning-service	40829937	John Spivey	2025-05-07 13:38:20.821	423399918	Google Usher	2025-05-07 13:38:26.268	40829937	2025-05-07 13:38:29.219
51	Morning Service, February 23, 2025	2025-02-23 00:00:00	FINALIZED	4139.00		2025-05-07 13:38:48.138427	2025-05-07 13:39:39.181	40829937	morning-service	40829937	John Spivey	2025-05-07 13:39:30.935	423399918	Google Usher	2025-05-07 13:39:36.676	40829937	2025-05-07 13:39:39.181
57	Morning Service, April 6, 2025	2025-04-06 00:00:00	FINALIZED	3000.00		2025-05-07 13:46:00.083738	2025-05-07 13:46:49.26	40829937	morning-service	40829937	John Spivey	2025-05-07 13:46:40.214	423399918	Google Usher	2025-05-07 13:46:44.597	40829937	2025-05-07 13:46:49.26
52	Morning Service, March 2, 2025	2025-03-02 00:00:00	FINALIZED	4923.00		2025-05-07 13:40:11.990153	2025-05-07 13:40:55.618	40829937	morning-service	40829937	John Spivey	2025-05-07 13:40:45.609	423399918	Google Usher	2025-05-07 13:40:52.277	40829937	2025-05-07 13:40:55.618
53	Morning Service, March 9, 2025	2025-03-09 00:00:00	FINALIZED	2829.00		2025-05-07 13:41:10.919657	2025-05-07 13:41:45.858	40829937	morning-service	40829937	John Spivey	2025-05-07 13:41:37.955	423399918	Google Usher	2025-05-07 13:41:43.086	40829937	2025-05-07 13:41:45.858
54	Morning Service, March 16, 2025	2025-03-16 00:00:00	FINALIZED	3823.00		2025-05-07 13:42:00.104352	2025-05-07 13:42:35.817	40829937	morning-service	40829937	John Spivey	2025-05-07 13:42:27.889	423399918	Google Usher	2025-05-07 13:42:33.117	40829937	2025-05-07 13:42:35.817
\.


--
-- Data for Name: donations; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.donations (id, date, amount, donation_type, check_number, notes, member_id, created_at, updated_at, notification_status, church_id, batch_id) FROM stdin;
76	2025-04-13 00:00:00	3789.00	CHECK	1111		1	2025-05-07 13:47:40.632564	2025-05-07 13:48:23.915	SENT	40829937	58
60	2025-02-16 00:00:00	304.00	CASH	\N		1	2025-05-07 13:38:03.835577	2025-05-07 13:38:30.076	SENT	40829937	50
61	2025-02-16 00:00:00	2091.00	CHECK	1111		1	2025-05-07 13:38:14.779258	2025-05-07 13:38:30.227	SENT	40829937	50
96	2025-04-27 00:00:00	4100.00	CHECK	1212		1	2025-05-07 17:27:22.952309	2025-05-07 18:37:39.497	SENT	40829937	63
62	2025-02-23 00:00:00	680.00	CASH	\N		1	2025-05-07 13:38:59.743925	2025-05-07 13:39:39.779	SENT	40829937	51
63	2025-02-23 00:00:00	3459.00	CHECK	1111		1	2025-05-07 13:39:21.798381	2025-05-07 13:39:39.93	SENT	40829937	51
86	2025-04-20 00:00:00	220.00	CASH	\N		\N	2025-05-07 15:08:42.532388	2025-05-07 15:08:42.646	NOT_REQUIRED	40829937	61
64	2025-03-02 00:00:00	525.00	CASH	\N		\N	2025-05-07 13:40:24.492277	2025-05-07 13:40:24.628	NOT_REQUIRED	40829937	52
65	2025-03-02 00:00:00	4398.00	CHECK	1111		1	2025-05-07 13:40:39.015535	2025-05-07 13:40:56.341	SENT	40829937	52
66	2025-03-09 00:00:00	64.00	CASH	\N		\N	2025-05-07 13:41:19.764545	2025-05-07 13:41:19.891	NOT_REQUIRED	40829937	53
67	2025-03-09 00:00:00	2765.00	CHECK	1111		1	2025-05-07 13:41:30.728604	2025-05-07 13:41:46.583	SENT	40829937	53
68	2025-03-16 00:00:00	400.00	CASH	\N		\N	2025-05-07 13:42:08.980325	2025-05-07 13:42:09.103	NOT_REQUIRED	40829937	54
85	2025-04-20 00:00:00	3689.00	CHECK	1111		1	2025-05-07 15:08:35.743357	2025-05-07 17:23:00.07	SENT	40829937	61
69	2025-03-16 00:00:00	3423.00	CHECK	1111		1	2025-05-07 13:42:20.859482	2025-05-07 13:42:36.633	SENT	40829937	54
70	2025-03-23 00:00:00	260.00	CASH	\N		\N	2025-05-07 13:43:46.724777	2025-05-07 13:43:46.845	NOT_REQUIRED	40829937	55
97	2025-04-27 00:00:00	120.00	CASH	\N		\N	2025-05-07 17:27:59.664838	2025-05-07 17:27:59.781	NOT_REQUIRED	40829937	63
71	2025-03-23 00:00:00	2987.00	CHECK	111		1	2025-05-07 13:44:08.902091	2025-05-07 13:44:25.876	SENT	40829937	55
72	2025-03-30 00:00:00	185.00	CASH	\N		\N	2025-05-07 13:44:57.101672	2025-05-07 13:44:57.233	NOT_REQUIRED	40829937	56
73	2025-03-30 00:00:00	3158.00	CHECK	1111		1	2025-05-07 13:45:23.655281	2025-05-07 13:45:39.755	SENT	40829937	56
75	2025-04-06 00:00:00	90.00	CASH	\N		\N	2025-05-07 13:46:34.42861	2025-05-07 13:46:34.566	NOT_REQUIRED	40829937	57
74	2025-04-06 00:00:00	2910.00	CHECK	1111		1	2025-05-07 13:46:27.434066	2025-05-07 13:46:49.979	SENT	40829937	57
77	2025-04-13 00:00:00	175.00	CASH	\N		\N	2025-05-07 13:48:06.401379	2025-05-07 13:48:06.524	NOT_REQUIRED	40829937	58
56	2025-02-02 00:00:00	437.00	CASH	\N		1	2025-05-07 13:35:10.978763	2025-05-07 13:35:57.301	SENT	40829937	48
57	2025-02-02 00:00:00	1564.00	CHECK	1111		1	2025-05-07 13:35:35.385239	2025-05-07 13:35:57.448	SENT	40829937	48
58	2025-02-09 00:00:00	290.00	CASH	\N		1	2025-05-07 13:36:29.911465	2025-05-07 13:37:13.342	SENT	40829937	49
59	2025-02-09 00:00:00	1987.00	CHECK	1111		1	2025-05-07 13:36:54.423639	2025-05-07 13:37:13.484	SENT	40829937	49
\.


--
-- Data for Name: email_templates; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.email_templates (id, template_type, subject, body_text, body_html, church_id, created_at, updated_at) FROM stdin;
3	DONATION_CONFIRMATION	Donation Receipt - {{churchName}}	Dear {{donorName}},\n\nThank you for your generous donation to {{churchName}}. Your support is a blessing to our church community and helps us continue our mission and ministry.\n\nDonation Details:\nAmount: ${{amount}}\nDate: {{date}}\nReceipt #: {{donationId}}\n\nYour contribution will help us:\n- Support outreach programs and assistance to those in need\n- Maintain our facilities and services for worship\n- Fund special ministries and programs\n- Continue our mission work in our community and beyond\n\nThis email serves as your official receipt for tax purposes.\n\nWe are grateful for your continued support and commitment to our church family.\n\nBlessings,\n{{churchName}}\n\n--\nThis is an automated receipt from {{churchName}} via PlateSync.\nPlease do not reply to this email. If you have any questions about your donation, please contact the church office directly.	\n<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #2D3748; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; background-color: #ffffff;">\n  <!-- Header with Church Logo -->\n  <div style="padding: 25px; text-align: center; border-bottom: 1px solid #e2e8f0;">\n    <div style="text-align: center;">\n      <img src="{{churchLogoUrl}}" alt="{{churchName}} Logo" style="max-width: 375px; max-height: 150px; margin: 0 auto;">\n    </div>\n    <p style="margin: 10px 0 0; font-size: 20px; font-weight: bold;">Donation Receipt</p>\n  </div>\n  \n  <!-- Main Content -->\n  <div style="padding: 30px;">\n    <p style="margin-top: 0;">Dear <strong>{{donorName}}</strong>,</p>\n    \n    <p>Thank you for your generous donation to {{churchName}}. Your support is a blessing to our church community and helps us continue our mission and ministry.</p>\n    \n    <!-- Donation Details Box -->\n    <div style="background-color: #f7fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 25px 0;">\n      <h2 style="margin-top: 0; color: #4299E1; font-size: 18px; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px;">Donation Details</h2>\n      <table style="width: 100%; border-collapse: collapse;">\n        <tr>\n          <td style="padding: 8px 0; width: 40%; color: #718096;">Amount:</td>\n          <td style="padding: 8px 0; font-weight: bold; color: #48BB78;">${{amount}}</td>\n        </tr>\n        <tr>\n          <td style="padding: 8px 0; color: #718096;">Date:</td>\n          <td style="padding: 8px 0;">{{date}}</td>\n        </tr>\n        <tr>\n          <td style="padding: 8px 0; color: #718096;">Receipt #:</td>\n          <td style="padding: 8px 0;">{{donationId}}</td>\n        </tr>\n      </table>\n    </div>\n    \n    <p>Your contribution will help us:</p>\n    <ul style="padding-left: 20px; line-height: 1.6;">\n      <li>Support outreach programs and assistance to those in need</li>\n      <li>Maintain our facilities and services for worship</li>\n      <li>Fund special ministries and programs</li>\n      <li>Continue our mission work in our community and beyond</li>\n    </ul>\n    \n    <p>This email serves as your official receipt for tax purposes.</p>\n    \n    <p>We are grateful for your continued support and commitment to our church family.</p>\n    \n    <p style="margin-bottom: 0;">Blessings,<br>\n    <strong>{{churchName}}</strong></p>\n  </div>\n  \n  <!-- Footer -->\n  <div style="background-color: #f7fafc; padding: 20px; text-align: center; font-size: 14px; color: #718096; border-top: 1px solid #e2e8f0;">\n    <p style="margin: 0;">This is an automated receipt from {{churchName}}.</p>\n    <p style="margin: 8px 0 0;">Please do not reply to this email. If you have any questions about your donation, please contact the church office directly.</p>\n  </div>\n</div>	40829937	2025-05-05 17:08:33.192383	2025-05-05 17:08:33.192383
1	WELCOME_EMAIL	Welcome to PlateSync	\nDear {{firstName}} {{lastName}},\n\nWelcome to PlateSync...the perfect app for counting plate donations with ease and efficiency!\n{{churchName}} has added you as a user to assist in the plate collection and counting as an usher.\n\nTo complete your account setup, please verify your email and create a password by clicking on the button below:\n{{verificationUrl}}?token={{verificationToken}}\n\nThis link will expire in 48 hours for security reasons.\n\nOnce verified, you'll be able to log in and access the PlateSync system to help manage donations for your church.\n\nIf you did not request this account, you can safely ignore this email.\n\nSincerely,\nThe PlateSync Team	\n<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; background-color: #ffffff;">\n  <div style="padding: 20px; text-align: center;">\n    <img src="https://images.squarespace-cdn.com/content/v1/676190801265eb0dc09c3768/739cc76d-9a1c-49b8-81d4-debf5f1bb208/PlateSync+Logo.png" alt="PlateSync Logo" style="width: 300px; margin: 0 auto;">\n  </div>\n  \n  <div style="padding: 0 30px 30px;">\n    <p>Dear <strong>{{firstName}} {{lastName}}</strong>,</p>\n    \n    <p>Welcome to PlateSync...the perfect app for counting plate donations with ease and efficiency!</p>\n    \n    <p><strong>{{churchName}}</strong> has added you as a user to assist in the plate collection and counting as an usher.</p>\n    \n    <p>To complete your account setup, please verify your email and create a password by clicking on the button below:</p>\n    \n    <div style="text-align: center; margin: 30px 0;">\n      <a href="{{verificationUrl}}?token={{verificationToken}}" \n         style="background-color: #69ad4c; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;">\n        Verify Email & Set Password\n      </a>\n    </div>\n    \n    <p>This link will expire in 48 hours for security reasons.</p>\n    \n    <p>Once verified, you'll be able to log in and access the PlateSync system to help manage donations for your church.</p>\n    \n    <p>If you did not request this account, you can safely ignore this email.</p>\n    \n    <p>Sincerely,<br>\n    <strong>The PlateSync Team</strong></p>\n  </div>\n</div>	40829937	2025-05-05 16:33:04.927907	2025-05-05 16:33:04.927907
2	PASSWORD_RESET	PlateSync Password Reset Request	\nHello,\n\nWe received a request to reset your password for your PlateSync account.\n\nPlease click on the following link to reset your password:\n{{resetUrl}}\n\nThis link will expire in 1 hour for security reasons.\n\nIf you did not request a password reset, please ignore this email or contact your administrator if you have concerns.\n\nSincerely,\nThe PlateSync Team	\n<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; background-color: #ffffff;">\n  <div style="padding: 20px; text-align: center;">\n    <img src="https://images.squarespace-cdn.com/content/v1/676190801265eb0dc09c3768/739cc76d-9a1c-49b8-81d4-debf5f1bb208/PlateSync+Logo.png" alt="PlateSync Logo" style="width: 270px; margin: 0 auto;">\n  </div>\n  \n  <!-- Main Content -->\n  <div style="padding: 0 30px 30px;">\n    <p style="margin-top: 0;">Hello,</p>\n    \n    <p>We received a request to reset the password for your PlateSync account.</p>\n    \n    <p>To set a new password, please click the button below:</p>\n    \n    <div style="text-align: center; margin: 30px 0;">\n      <a href="{{resetUrl}}" \n         style="background-color: #69ad4c; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;">\n        Reset Password\n      </a>\n    </div>\n    \n    <p>This link will expire in 1 hour for security reasons.</p>\n    \n    <p>If you did not request a password reset, please ignore this email or contact your administrator if you have concerns.</p>\n    \n    <p style="margin-bottom: 0;">Sincerely,<br>\n    <strong>The PlateSync Team</strong></p>\n  </div>\n</div>	40829937	2025-05-05 16:33:05.02552	2025-05-05 16:33:05.02552
5	WELCOME_EMAIL	Welcome to PlateSync	\nDear {{firstName}} {{lastName}},\n\nWelcome to PlateSync...the perfect app for counting plate donations with ease and efficiency!\n{{churchName}} has added you as a user to assist in the plate collection and counting as an usher.\n\nTo complete your account setup, please verify your email and create a password by clicking on the link below:\n{{verificationUrl}}?token={{verificationToken}}\n\nThis link will expire in 48 hours for security reasons.\n\nOnce verified, you'll be able to log in and access the PlateSync system to help manage donations for your church.\n\nIf you did not request this account, you can safely ignore this email.\n\nSincerely,\nThe PlateSync Team	\n<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #2D3748; border: 1px solid #e2e8f0; border-radius: 8px;">\n  <!-- Header with Logo and Title -->\n  <div style="padding: 25px; text-align: center;">\n    <div style="display: block; margin: 0 auto;">\n      <img src="https://platesync.replit.app/logo-with-text.png" alt="PlateSync" style="max-width: 350px; height: auto;" />\n      <div style="font-size: 14px; color: #555; margin-top: 5px; text-transform: uppercase; letter-spacing: 1px;">\n        CHURCH COLLECTION MANAGEMENT\n      </div>\n    </div>\n  </div>\n  \n  <!-- Main Content -->\n  <div style="background-color: #ffffff; padding: 0 30px 30px;">\n    <p style="margin-top: 0;">Dear <strong>{{firstName}} {{lastName}}</strong>,</p>\n    \n    <p>Welcome to PlateSync...the perfect app for counting plate donations with ease and efficiency!</p>\n    \n    <p><strong>{{churchName}}</strong> has added you as a user to assist in the plate collection and counting as an usher.</p>\n    \n    <p>To complete your account setup, please verify your email and create a password by clicking on the button below:</p>\n    \n    <div style="text-align: center; margin: 30px 0;">\n      <a href="{{verificationUrl}}?token={{verificationToken}}" \n         style="background-color: #69ad4c; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;">\n        Verify Email & Set Password\n      </a>\n    </div>\n    \n    <p>This link will expire in 48 hours for security reasons.</p>\n    \n    <p>Once verified, you'll be able to log in and access the PlateSync system to help manage donations for your church.</p>\n    \n    <p>If you did not request this account, you can safely ignore this email.</p>\n    \n    <p style="margin-bottom: 0;">Sincerely,<br>\n    <strong>The PlateSync Team</strong></p>\n  </div>\n</div>	644128517	2025-05-06 17:14:34.616014	2025-05-06 17:14:34.616014
6	PASSWORD_RESET	PlateSync Password Reset Request	\nHello,\n\nWe received a request to reset your password for your PlateSync account.\n\nPlease click on the following link to reset your password:\n{{resetUrl}}\n\nThis link will expire in 1 hour for security reasons.\n\nIf you did not request a password reset, please ignore this email or contact your administrator if you have concerns.\n\nSincerely,\nThe PlateSync Team	\n<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #2D3748;">\n  <!-- Header with Logo and Title -->\n  <div style="background-color: #69ad4c; color: white; padding: 25px; text-align: center; border-radius: 8px 8px 0 0;">\n    <h1 style="margin: 0; font-size: 24px;">PlateSync</h1>\n    <p style="margin: 10px 0 0; font-size: 18px;">Password Reset Request</p>\n  </div>\n  \n  <!-- Main Content -->\n  <div style="background-color: #ffffff; padding: 30px; border-left: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0;">\n    <p style="margin-top: 0;">Hello,</p>\n    \n    <p>We received a request to reset the password for your PlateSync account.</p>\n    \n    <p>To set a new password, please click the button below:</p>\n    \n    <div style="text-align: center; margin: 30px 0;">\n      <a href="{{resetUrl}}" \n         style="background-color: #69ad4c; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;">\n        Reset Password\n      </a>\n    </div>\n    \n    <p>This link will expire in 1 hour for security reasons.</p>\n    \n    <p>If you did not request a password reset, please ignore this email or contact your administrator if you have concerns.</p>\n    \n    <p style="margin-bottom: 0;">Sincerely,<br>\n    <strong>The PlateSync Team</strong></p>\n  </div>\n  \n  <!-- Footer -->\n  <div style="background-color: #f7fafc; padding: 20px; text-align: center; font-size: 14px; color: #718096; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">\n    <p style="margin: 0;">This is an automated message from PlateSync.</p>\n    <p style="margin: 8px 0 0;">Please do not reply to this email.</p>\n  </div>\n</div>	644128517	2025-05-06 17:14:34.772702	2025-05-06 17:14:34.772702
7	DONATION_CONFIRMATION	Donation Receipt - {{churchName}}	Dear {{donorName}},\n\nThank you for your generous donation to {{churchName}}. Your support is a blessing to our church community and helps us continue our mission and ministry.\n\nDonation Details:\nAmount: ${{amount}}\nDate: {{date}}\nReceipt #: {{donationId}}\n\nYour contribution will help us:\n- Support outreach programs and assistance to those in need\n- Maintain our facilities and services for worship\n- Fund special ministries and programs\n- Continue our mission work in our community and beyond\n\nThis email serves as your official receipt for tax purposes.\n\nWe are grateful for your continued support and commitment to our church family.\n\nBlessings,\n{{churchName}}\n\n--\nThis is an automated receipt from {{churchName}} via PlateSync.\nPlease do not reply to this email. If you have any questions about your donation, please contact the church office directly.	\n<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #2D3748;">\n  <!-- Header with Logo and Title -->\n  <div style="background-color: #2D3748; color: white; padding: 25px; text-align: center; border-radius: 8px 8px 0 0;">\n    <h1 style="margin: 0; font-size: 24px;">{{churchName}}</h1>\n    <p style="margin: 10px 0 0; font-size: 18px;">Donation Receipt</p>\n  </div>\n  \n  <!-- Main Content -->\n  <div style="background-color: #ffffff; padding: 30px; border-left: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0;">\n    <p style="margin-top: 0;">Dear <strong>{{donorName}}</strong>,</p>\n    \n    <p>Thank you for your generous donation to {{churchName}}. Your support is a blessing to our church community and helps us continue our mission and ministry.</p>\n    \n    <!-- Donation Details Box -->\n    <div style="background-color: #f7fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 25px 0;">\n      <h2 style="margin-top: 0; color: #4299E1; font-size: 18px; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px;">Donation Details</h2>\n      <table style="width: 100%; border-collapse: collapse;">\n        <tr>\n          <td style="padding: 8px 0; width: 40%; color: #718096;">Amount:</td>\n          <td style="padding: 8px 0; font-weight: bold; color: #48BB78;">${{amount}}</td>\n        </tr>\n        <tr>\n          <td style="padding: 8px 0; color: #718096;">Date:</td>\n          <td style="padding: 8px 0;">{{date}}</td>\n        </tr>\n        <tr>\n          <td style="padding: 8px 0; color: #718096;">Receipt #:</td>\n          <td style="padding: 8px 0;">{{donationId}}</td>\n        </tr>\n      </table>\n    </div>\n    \n    <p>Your contribution will help us:</p>\n    <ul style="padding-left: 20px; line-height: 1.6;">\n      <li>Support outreach programs and assistance to those in need</li>\n      <li>Maintain our facilities and services for worship</li>\n      <li>Fund special ministries and programs</li>\n      <li>Continue our mission work in our community and beyond</li>\n    </ul>\n    \n    <p>This email serves as your official receipt for tax purposes.</p>\n    \n    <p>We are grateful for your continued support and commitment to our church family.</p>\n    \n    <p style="margin-bottom: 0;">Blessings,<br>\n    <strong>{{churchName}}</strong></p>\n  </div>\n  \n  <!-- Footer -->\n  <div style="background-color: #f7fafc; padding: 20px; text-align: center; font-size: 14px; color: #718096; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">\n    <p style="margin: 0;">This is an automated receipt from {{churchName}} via PlateSync.</p>\n    <p style="margin: 8px 0 0;">Please do not reply to this email. If you have any questions about your donation, please contact the church office directly.</p>\n  </div>\n</div>	644128517	2025-05-06 17:14:34.863873	2025-05-06 17:14:34.863873
4	COUNT_REPORT	Count Report - {{churchName}}	Dear {{recipientName}},\n\nA count has been finalized for {{churchName}}, and a Detailed Count Report is attached to this email for your review.\n\nCount Details:\nCount: {{batchName}}\nDate: {{batchDate}}\nTotal Amount: ${{totalAmount}}\nCash: ${{cashAmount}}\nChecks: ${{checkAmount}}\nNumber of Donations: {{donationCount}}\n\nThis report is automatically generated by PlateSync when a count is finalized after attestation.\n\nSincerely,\nPlateSync Reporting System	\n<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #2D3748; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; background-color: #ffffff;">\n  <!-- Header with Church Logo -->\n  <div style="padding: 25px; text-align: center; border-bottom: 1px solid #e2e8f0;">\n    <div style="text-align: center;">\n      <img src="{{churchLogoUrl}}" alt="{{churchName}} Logo" style="max-width: 375px; max-height: 150px; margin: 0 auto;">\n    </div>\n    <h2 style="margin: 10px 0 0; font-size: 20px; font-weight: bold;">Count Report</h2>\n  </div>\n  \n  <!-- Main Content -->\n  <div style="padding: 30px;">\n    <p style="margin-top: 0;">Dear <strong>{{recipientName}}</strong>,</p>\n    \n    <p>A count has been finalized for <strong>{{churchName}}</strong>, and a <strong>Detailed Count Report</strong> is attached to this email for your review.</p>\n    \n    <!-- Count Details Box -->\n    <div style="background-color: #f7fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 25px 0;">\n      <h2 style="margin-top: 0; color: #4299E1; font-size: 18px; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px;">Count Details</h2>\n      <table style="width: 100%; border-collapse: collapse;">\n        <tr>\n          <td style="padding: 8px 0; width: 40%; color: #718096;">Count:</td>\n          <td style="padding: 8px 0;">{{batchName}}</td>\n        </tr>\n        <tr>\n          <td style="padding: 8px 0; color: #718096;">Date:</td>\n          <td style="padding: 8px 0;">{{batchDate}}</td>\n        </tr>\n        <tr>\n          <td style="padding: 8px 0; color: #718096;">Total Amount:</td>\n          <td style="padding: 8px 0; font-weight: bold; color: #48BB78;">${{totalAmount}}</td>\n        </tr>\n        <tr>\n          <td style="padding: 8px 0; color: #718096;">Cash:</td>\n          <td style="padding: 8px 0;">${{cashAmount}}</td>\n        </tr>\n        <tr>\n          <td style="padding: 8px 0; color: #718096;">Checks:</td>\n          <td style="padding: 8px 0;">${{checkAmount}}</td>\n        </tr>\n        <tr>\n          <td style="padding: 8px 0; color: #718096;">Number of Donations:</td>\n          <td style="padding: 8px 0;">{{donationCount}}</td>\n        </tr>\n      </table>\n    </div>\n    \n    <p>This report is automatically generated when a count is finalized after attestation.</p>\n    \n    <p style="margin-bottom: 0;">Sincerely,<br>\n    <strong>{{churchName}}</strong></p>\n  </div>\n  \n  <!-- Footer -->\n  <div style="background-color: #f7fafc; padding: 20px; text-align: center; font-size: 14px; color: #718096; border-top: 1px solid #e2e8f0;">\n    <p style="margin: 0;">This is an automated report from {{churchName}}.</p>\n    <p style="margin: 8px 0 0;">Please do not reply to this email.</p>\n  </div>\n</div>	40829937	2025-05-05 17:08:33.29029	2025-05-05 17:08:33.29029
8	COUNT_REPORT	Count Report - {{churchName}}	Dear {{recipientName}},\n\nA count has been finalized for {{churchName}}, and a Detailed Count Report is attached to this email for your review.\n\nCount Details:\nCount: {{batchName}}\nDate: {{batchDate}}\nTotal Amount: ${{totalAmount}}\nCash: ${{cashAmount}}\nChecks: ${{checkAmount}}\nNumber of Donations: {{donationCount}}\n\nThis report is automatically generated by PlateSync when a count is finalized after attestation.\n\nSincerely,\nPlateSync Reporting System	\n<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #2D3748;">\n  <!-- Header with Logo and Title -->\n  <div style="background-color: #69ad4c; color: white; padding: 25px; text-align: center; border-radius: 8px 8px 0 0;">\n    <h1 style="margin: 0; font-size: 24px;">{{churchName}}</h1>\n    <p style="margin: 10px 0 0; font-size: 18px;">Count Report</p>\n  </div>\n  \n  <!-- Main Content -->\n  <div style="background-color: #ffffff; padding: 30px; border-left: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0;">\n    <p style="margin-top: 0;">Dear <strong>{{recipientName}}</strong>,</p>\n    \n    <p>A count has been finalized for <strong>{{churchName}}</strong>, and a <strong>Detailed Count Report</strong> is attached to this email for your review.</p>\n    \n    <!-- Count Details Box -->\n    <div style="background-color: #f7fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 25px 0;">\n      <h2 style="margin-top: 0; color: #4299E1; font-size: 18px; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px;">Count Details</h2>\n      <table style="width: 100%; border-collapse: collapse;">\n        <tr>\n          <td style="padding: 8px 0; width: 40%; color: #718096;">Count:</td>\n          <td style="padding: 8px 0;">{{batchName}}</td>\n        </tr>\n        <tr>\n          <td style="padding: 8px 0; color: #718096;">Date:</td>\n          <td style="padding: 8px 0;">{{batchDate}}</td>\n        </tr>\n        <tr>\n          <td style="padding: 8px 0; color: #718096;">Total Amount:</td>\n          <td style="padding: 8px 0; font-weight: bold; color: #48BB78;">${{totalAmount}}</td>\n        </tr>\n        <tr>\n          <td style="padding: 8px 0; color: #718096;">Cash:</td>\n          <td style="padding: 8px 0;">${{cashAmount}}</td>\n        </tr>\n        <tr>\n          <td style="padding: 8px 0; color: #718096;">Checks:</td>\n          <td style="padding: 8px 0;">${{checkAmount}}</td>\n        </tr>\n        <tr>\n          <td style="padding: 8px 0; color: #718096;">Number of Donations:</td>\n          <td style="padding: 8px 0;">{{donationCount}}</td>\n        </tr>\n      </table>\n    </div>\n    \n    <p>This report is automatically generated by PlateSync when a count is finalized after attestation.</p>\n    \n    <p style="margin-bottom: 0;">Sincerely,<br>\n    <strong>PlateSync Reporting System</strong></p>\n  </div>\n  \n  <!-- Footer -->\n  <div style="background-color: #f7fafc; padding: 20px; text-align: center; font-size: 14px; color: #718096; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">\n    <p style="margin: 0;">This is an automated report from PlateSync.</p>\n    <p style="margin: 8px 0 0;">Please do not reply to this email.</p>\n  </div>\n</div>	644128517	2025-05-06 17:14:34.960773	2025-05-06 17:14:34.960773
\.


--
-- Data for Name: members; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.members (id, first_name, last_name, email, phone, is_visitor, created_at, updated_at, notes, church_id, external_id, external_system) FROM stdin;
38	Betty	Bivins	bettybivins@gmail.com	601-918-3581	f	2025-05-03 19:33:48.638584	2025-05-10 19:08:23.365		40829937	123482581	PLANNING_CENTER
60	Skip	Chandler	skip.chandler@reagan.com	918-237-0060	f	2025-05-03 19:33:49.6607	2025-05-10 19:08:25.757		40829937	123482603	PLANNING_CENTER
40	Caroline	Brady	carolinebrady@cox.net	504-452-8736	f	2025-05-03 19:33:48.734351	2025-05-10 19:08:23.547		40829937	123482583	PLANNING_CENTER
44	William	Brand	billbrand22@gmail.com	601-278-4438	f	2025-05-03 19:33:48.913561	2025-05-10 19:08:23.908		40829937	123482587	PLANNING_CENTER
61	Nancy	Chandler	nchandler504@gmail.com	918-237-0061	f	2025-05-03 19:33:49.705898	2025-05-10 19:08:25.862		40829937	123482604	PLANNING_CENTER
62	Emily	Cook	emilycook2010@gmail.com	(540) 308-0807	f	2025-05-03 19:33:49.750892	2025-05-10 19:08:25.967		40829937	123482605	PLANNING_CENTER
3	Olga	Spivey	olgaspivey@me.com	6017204399	f	2025-05-03 19:33:47.061095	2025-05-10 19:08:19.665		40829937	123344886	PLANNING_CENTER
4	Olga Wright	Spivey	owspivey@me.com	(615) 957-1726	f	2025-05-03 19:33:47.11569	2025-05-10 19:08:19.765		40829937	123351852	PLANNING_CENTER
18	Noah	Atwi	noah.atwi@gmail.com	337-501-3918	f	2025-05-03 19:33:47.741945	2025-05-10 19:08:21.103		40829937	123482561	PLANNING_CENTER
20	Cindy Sun	Atwi	csun1895@gmail.com	630-328-3301	f	2025-05-03 19:33:47.830891	2025-05-10 19:08:21.281		40829937	123482563	PLANNING_CENTER
21	Ralph	Baker	ralph.baker0@gmail.com	803-351-1126	f	2025-05-03 19:33:47.875982	2025-05-10 19:08:21.371		40829937	123482564	PLANNING_CENTER
24	Patty	Barnes	plbcpa@fmbcci.com	504-481-3817	f	2025-05-03 19:33:48.011727	2025-05-10 19:08:21.64		40829937	123482567	PLANNING_CENTER
27	Jeff	Baumgarten	jeffreybaumgarten@me.com	504-919-7537	f	2025-05-03 19:33:48.145164	2025-05-10 19:08:21.919		40829937	123482570	PLANNING_CENTER
30	Amy Hill	Beebe	amylee83@gmail.com	\N	f	2025-05-03 19:33:48.281454	2025-05-10 19:08:22.564		40829937	123482573	PLANNING_CENTER
31	Jon	Beebe	jonbb96@yahoo.com	\N	f	2025-05-03 19:33:48.326071	2025-05-10 19:08:22.669		40829937	123482574	PLANNING_CENTER
32	Clay	Beery	cbeery@laitram.com	504-210-9696	f	2025-05-03 19:33:48.370549	2025-05-10 19:08:22.761		40829937	123482575	PLANNING_CENTER
34	Julia	Beery	jhbeery@gmail.com	504-722-4831	f	2025-05-03 19:33:48.460727	2025-05-10 19:08:22.961		40829937	123482577	PLANNING_CENTER
46	Andrew	Breen	andrew.n.breen@gmail.com	703-400-1252	f	2025-05-03 19:33:49.011899	2025-05-10 19:08:24.091		40829937	123482589	PLANNING_CENTER
47	Ann	Breen	eannbreen@gmail.com	202-251-9551	f	2025-05-03 19:33:49.056376	2025-05-10 19:08:24.186		40829937	123482590	PLANNING_CENTER
48	Benjamin	Cabell	benji.cabell@icloud.com	\N	f	2025-05-03 19:33:49.100755	2025-05-10 19:08:24.275		40829937	123482591	PLANNING_CENTER
52	Todd	Campbell	farewelltofenway@yahoo.com	337-278-7234	f	2025-05-03 19:33:49.277298	2025-05-10 19:08:24.649		40829937	123482595	PLANNING_CENTER
54	Andrew	Cannata	andrew449944@gmail.com	\N	f	2025-05-03 19:33:49.380094	2025-05-10 19:08:24.827		40829937	123482597	PLANNING_CENTER
55	Rachel	Cannata	rachel.cannata@hotmail.com	504-722-4067	f	2025-05-03 19:33:49.424238	2025-05-10 19:08:24.917		40829937	123482598	PLANNING_CENTER
56	Kathy	Cannata	cannata2@yahoo.com	504-458-4959	f	2025-05-03 19:33:49.47648	2025-05-10 19:08:25.041		40829937	123482599	PLANNING_CENTER
58	Josiah	Carey	josiah.carey@gmail.com	434-249-6633	f	2025-05-03 19:33:49.565855	2025-05-10 19:08:25.497		40829937	123482601	PLANNING_CENTER
65	Michael	Cook	mcook57@outlook.com	4438521584	f	2025-05-03 19:33:49.898385	2025-05-10 19:08:26.253		40829937	123482608	PLANNING_CENTER
69	Kim	Cothran	kim.cothran@gmail.com	504-421-0768	f	2025-05-03 19:33:50.077256	2025-05-10 19:08:26.608		40829937	123482613	PLANNING_CENTER
70	Ted	Cothran	ted.cothran@gmail.com	504-421-0945	f	2025-05-03 19:33:50.122948	2025-05-10 19:08:26.698		40829937	123482614	PLANNING_CENTER
71	Jesse	Cougle	jcougle@gmail.com	850-345-8488	f	2025-05-03 19:33:50.167477	2025-05-10 19:08:26.788		40829937	123482615	PLANNING_CENTER
72	Stephen	Cox	stephengreenthumb@gmail.com	919-610-2974	f	2025-05-03 19:33:50.211594	2025-05-10 19:08:26.88		40829937	123482616	PLANNING_CENTER
74	Maddie	Cox	mq.ciszewski@gmail.com	202-641-1879	f	2025-05-03 19:33:50.299944	2025-05-10 19:08:27.057		40829937	123482618	PLANNING_CENTER
5	Daniel	Spivey	daspivey37@outlook.com	601-500-0346	f	2025-05-03 19:33:47.160509	2025-05-10 19:08:19.861		40829937	123352105	PLANNING_CENTER
6	Jason	Cabell	jason.cabell@gmail.com	601-209-0581	f	2025-05-03 19:33:47.205243	2025-05-10 19:08:19.961		40829937	123352359	PLANNING_CENTER
7	Hannah	Cabell	hannah@redeemernola.com	(504) 214-8142	f	2025-05-03 19:33:47.249792	2025-05-10 19:08:20.051		40829937	123352412	PLANNING_CENTER
9	Ken	Kostrzewa	ken@redeemernola.com	504-388-5948	f	2025-05-03 19:33:47.339126	2025-05-10 19:08:20.266		40829937	123352544	PLANNING_CENTER
11	Ben	Apple	donmanzana@gmail.com	843-521-7683	f	2025-05-03 19:33:47.429684	2025-05-10 19:08:20.461		40829937	123482553	PLANNING_CENTER
12	Sandi	Anton	sranton1953@gmail.com	734-968-3458	f	2025-05-03 19:33:47.474548	2025-05-10 19:08:20.556		40829937	123482554	PLANNING_CENTER
13	Virginia	Apple	virginia.apple@gmail.com	834-521-7685	f	2025-05-03 19:33:47.519191	2025-05-10 19:08:20.646		40829937	123482556	PLANNING_CENTER
16	Katie	Adams	katie_e.walsh@yahoo.com	850-339-3459	f	2025-05-03 19:33:47.653868	2025-05-10 19:08:20.916		40829937	123482559	PLANNING_CENTER
35	Travis	Bonaventure	bcpfinishes@gmail.com	504-408-5279	f	2025-05-03 19:33:48.505208	2025-05-10 19:08:23.071		40829937	123482578	PLANNING_CENTER
37	Elbert	Bivins	jelbertbivins@gmail.com	6015663711	f	2025-05-03 19:33:48.594317	2025-05-10 19:08:23.269		40829937	123482580	PLANNING_CENTER
82	Christine	Davis	christinehayden1206@gmail.com	205-370-4432	f	2025-05-03 19:33:50.658757	2025-05-10 19:08:27.773		40829937	123482626	PLANNING_CENTER
84	Arthur	Davis	arthurpdavis@gmail.com	601-955-6061	f	2025-05-03 19:33:50.747937	2025-05-10 19:08:27.95		40829937	123482628	PLANNING_CENTER
86	Richie	DiRosa	asoridr@gmail.com	504-329-8180	f	2025-05-03 19:33:50.836931	2025-05-10 19:08:28.136		40829937	123482630	PLANNING_CENTER
87	Kathan	Dearman	kathandearman@gmail.com	504-615-6344	f	2025-05-03 19:33:50.880951	2025-05-10 19:08:28.229		40829937	123482631	PLANNING_CENTER
88	Jan	Douma	J.Douma@shell.com	504-301-8579	f	2025-05-03 19:33:50.925255	2025-05-10 19:08:28.322		40829937	123482632	PLANNING_CENTER
89	Lauren	Dunaway	laurenfutrell@gmail.com	504-715-9999	f	2025-05-03 19:33:50.969378	2025-05-10 19:08:28.411		40829937	123482633	PLANNING_CENTER
91	Joe	Dunaway	joseph.dunaway@gmail.com	504-881-6612	f	2025-05-03 19:33:51.05818	2025-05-10 19:08:28.647		40829937	123482635	PLANNING_CENTER
96	Alexandria	Elliot	alexandriaelliot3@gmail.com	334-797-9972	f	2025-05-03 19:33:51.281465	2025-05-10 19:08:29.297		40829937	123482640	PLANNING_CENTER
97	Jorda	Elliot	jfelliot@gmail.com	251-753-2934	f	2025-05-03 19:33:51.325532	2025-05-10 19:08:29.393		40829937	123482641	PLANNING_CENTER
100	Bonney	Ellison	bonney331@aol.com	601-946-2109	f	2025-05-03 19:33:51.46352	2025-05-10 19:08:29.674		40829937	123482644	PLANNING_CENTER
104	Ian	Ferguson	iangferguson@btinternet.com	(832) 833-5334	f	2025-05-03 19:33:51.642441	2025-05-10 19:08:30.035		40829937	123482648	PLANNING_CENTER
106	Eli	Fisher	efisher82@gmail.com	(518) 817-1172	f	2025-05-03 19:33:51.732072	2025-05-10 19:08:30.229		40829937	123482650	PLANNING_CENTER
107	Andrew	Fuglestad	andrewfuglestad@gmail.com	(218) 341-4311	f	2025-05-03 19:33:51.776524	2025-05-10 19:08:30.318		40829937	123482651	PLANNING_CENTER
108	Ashlee	Filkins	ashleefilkins@gmail.com	(210) 529-2555	f	2025-05-03 19:33:51.819849	2025-05-10 19:08:30.407		40829937	123482652	PLANNING_CENTER
109	Anushka	Ghosh	aghosh1@tulane.edu	(504) 388-1851	f	2025-05-03 19:33:51.864313	2025-05-10 19:08:30.496		40829937	123482654	PLANNING_CENTER
110	Ethan	Hales	ethancana@me.com	(504) 913-2827	f	2025-05-03 19:33:51.918191	2025-05-10 19:08:30.585		40829937	123482655	PLANNING_CENTER
111	Cana	Hales	canaamor@me.com	(504) 234-1737	f	2025-05-03 19:33:51.96255	2025-05-10 19:08:30.673		40829937	123482656	PLANNING_CENTER
117	Doug	Harmon	blindwall@hotmail.com	(504) 220-0387	f	2025-05-03 19:33:52.228461	2025-05-10 19:08:31.212		40829937	123482663	PLANNING_CENTER
124	Dan	Harris	danharrisdds@yahoo.com	(760) 213-2947	f	2025-05-03 19:33:52.53858	2025-05-10 19:08:31.942		40829937	123482671	PLANNING_CENTER
146	David	Klump	klumpdavid@gmail.com	(504) 669-2226	f	2025-05-03 19:33:53.512305	2025-05-10 19:08:34.211		40829937	123482697	PLANNING_CENTER
126	Ann Kirk	Harris	annkirkjacobs@gmail.com	(601) 754-2262	f	2025-05-03 19:33:52.626925	2025-05-10 19:08:32.328		40829937	123482674	PLANNING_CENTER
131	Debi	Hugele	debihugele@gmail.com	(281) 467-7118	f	2025-05-03 19:33:52.848168	2025-05-10 19:08:32.829		40829937	123482682	PLANNING_CENTER
132	Jacob	Heaton	jheaton36@gmail.com	(352) 217-7155	f	2025-05-03 19:33:52.892122	2025-05-10 19:08:32.92		40829937	123482683	PLANNING_CENTER
133	Heather	Heaton	hryanfl@gmail.com	(407) 341-0558	f	2025-05-03 19:33:52.937873	2025-05-10 19:08:33.019		40829937	123482684	PLANNING_CENTER
137	Harrison	Hunter	harrisonhunter27@gmail.com	\N	f	2025-05-03 19:33:53.113871	2025-05-10 19:08:33.373		40829937	123482688	PLANNING_CENTER
77	Chelsea	Crews	chelsmcole@gmail.com	\N	f	2025-05-03 19:33:50.436423	2025-05-10 19:08:27.327		40829937	123482621	PLANNING_CENTER
79	Colby	Curtis	ccolby97@gmail.com	(601) 329-8555	f	2025-05-03 19:33:50.524911	2025-05-10 19:08:27.507		40829937	123482623	PLANNING_CENTER
81	Rawlins	Curtis	rawlins.biggs@gmail.com	6012601385	f	2025-05-03 19:33:50.61431	2025-05-10 19:08:27.684		40829937	123482625	PLANNING_CENTER
190	Emily	McCorkle	e.mccorkle@gmail.com	\N	f	2025-05-03 19:33:55.474541	2025-05-10 19:08:38.643		40829937	123482742	PLANNING_CENTER
192	Catherine	McDermott	catgeo84@yahoo.com	(504) 220-4256	f	2025-05-03 19:33:55.563322	2025-05-10 19:08:38.825		40829937	123482744	PLANNING_CENTER
193	Eileen	McNulty	eileen.mckenna@gmail.com	(504) 616-5003	f	2025-05-03 19:33:55.60723	2025-05-10 19:08:38.913		40829937	123482745	PLANNING_CENTER
198	Emily	Mohlenbrok	emilymohlenbrok@gmail.com	(205) 799-1193	f	2025-05-03 19:33:55.828281	2025-05-10 19:08:39.362		40829937	123482750	PLANNING_CENTER
202	Amy	Moran	\N	\N	f	2025-05-03 19:33:56.018161	2025-05-10 19:08:39.735		40829937	123482754	PLANNING_CENTER
216	Jonathan	Peterson	\N	\N	f	2025-05-03 19:33:56.643348	2025-05-10 19:08:41.055		40829937	123482772	PLANNING_CENTER
217	Jordan	Peck	jordanpeckstl@gmail.com	\N	f	2025-05-03 19:33:56.68842	2025-05-10 19:08:41.145		40829937	123482773	PLANNING_CENTER
218	Audrey	Peterson	\N	\N	f	2025-05-03 19:33:56.733215	2025-05-10 19:08:41.234		40829937	123482774	PLANNING_CENTER
219	Rebecca	Otten	rebecca.otten@gmail.com	(262) 853-4467	f	2025-05-03 19:33:56.777235	2025-05-10 19:08:41.323		40829937	123482775	PLANNING_CENTER
203	Brock	Moran	\N	\N	f	2025-05-03 19:33:56.065273	2025-05-10 19:08:39.823		40829937	123482755	PLANNING_CENTER
149	Cameron	Kilpatrick	cameronkilpatrick@gmail.com	(706) 402-7821	f	2025-05-03 19:33:53.64431	2025-05-10 19:08:34.493		40829937	123482700	PLANNING_CENTER
204	Dan	Moran	\N	\N	f	2025-05-03 19:33:56.109916	2025-05-10 19:08:39.914		40829937	123482756	PLANNING_CENTER
205	Sarah	Moran	\N	\N	f	2025-05-03 19:33:56.155275	2025-05-10 19:08:40.003		40829937	123482757	PLANNING_CENTER
206	Anna	Newman	annahle323@gmail.com	(864) 237-4568	f	2025-05-03 19:33:56.199637	2025-05-10 19:08:40.092		40829937	123482760	PLANNING_CENTER
207	Michael	Newman	mnewman.au@gmail.com	(985) 710-5353	f	2025-05-03 19:33:56.243661	2025-05-10 19:08:40.18		40829937	123482761	PLANNING_CENTER
220	Pauline	Ramos	casaderamos@me.com	(713) 828-9023	f	2025-05-03 19:33:56.821116	2025-05-10 19:08:41.411		40829937	123482776	PLANNING_CENTER
221	Gia	Ramos	\N	\N	f	2025-05-03 19:33:56.865089	2025-05-10 19:08:41.514		40829937	123482777	PLANNING_CENTER
209	Charlotte	Ordeneaux	crordeneaux@hotmail.com	(504) 214-2972	f	2025-05-03 19:33:56.331487	2025-05-10 19:08:50.685		40829937	142206089	PLANNING_CENTER
208	Tara	Nored	taranored06@gmail.com	(210) 452-2264	f	2025-05-03 19:33:56.287484	2025-05-10 19:08:40.269		40829937	123482762	PLANNING_CENTER
155	Jamie	Koffler	paulkoffler@gmail.com	(504) 329-5574	f	2025-05-03 19:33:53.910378	2025-05-10 19:08:35.226		40829937	123482706	PLANNING_CENTER
156	Caroline	Korndorffer	ckorndor@gmail.com	(504) 330-0496	f	2025-05-03 19:33:53.954294	2025-05-10 19:08:35.375		40829937	123482707	PLANNING_CENTER
167	Christie	LaPlante	Christie.laplante@yahoo.com	(210) 849-7991	f	2025-05-03 19:33:54.443012	2025-05-10 19:08:36.391		40829937	123482718	PLANNING_CENTER
175	Judy	Lapeyre	pjverret@cox.net	(504) 382-4457	f	2025-05-03 19:33:54.797447	2025-05-10 19:08:37.107		40829937	123482726	PLANNING_CENTER
177	Jamie	Logan	JLogan7@tulane.edu	(601) 813-4611	f	2025-05-03 19:33:54.88528	2025-05-10 19:08:37.29		40829937	123482729	PLANNING_CENTER
181	Hannah	MacGowan	hechotin@gmail.com	(985) 630-4505	f	2025-05-03 19:33:55.063934	2025-05-10 19:08:37.647		40829937	123482733	PLANNING_CENTER
183	Jonathan	Maki	NJMaki@gmail.com	(504) 982-1115	f	2025-05-03 19:33:55.153636	2025-05-10 19:08:37.824		40829937	123482735	PLANNING_CENTER
184	Barrett	MacGowan	blmacgowan@gmail.com	(985) 373-5463	f	2025-05-03 19:33:55.199153	2025-05-10 19:08:37.922		40829937	123482736	PLANNING_CENTER
185	Cecilia	Marshall	cbmarsh504@gmail.com	\N	f	2025-05-03 19:33:55.248414	2025-05-10 19:08:38.015		40829937	123482737	PLANNING_CENTER
189	Della	Mays	mommamays@hotmail.com	(352) 339-5006	f	2025-05-03 19:33:55.43047	2025-05-10 19:08:38.546		40829937	123482741	PLANNING_CENTER
210	Henry	Ordeneaux	\N	\N	f	2025-05-03 19:33:56.376562	2025-05-10 19:08:40.519		40829937	123482764	PLANNING_CENTER
211	Chidinma	Nwankwo	chimanmanwankwo@gmail.com	(504) 388-9156	f	2025-05-03 19:33:56.420663	2025-05-10 19:08:40.607		40829937	123482765	PLANNING_CENTER
212	Jimmy	Ordeneaux	jordeneaux@pmpllp.com	(504) 616-9021	f	2025-05-03 19:33:56.465255	2025-05-10 19:08:40.695		40829937	123482767	PLANNING_CENTER
213	April	Payne	payneaj79@gmail.com	(504) 722-8599	f	2025-05-03 19:33:56.509478	2025-05-10 19:08:40.784		40829937	123482768	PLANNING_CENTER
214	John	Payne	Littlepayne69@yahoo.com	(504) 722-9304	f	2025-05-03 19:33:56.553602	2025-05-10 19:08:40.874		40829937	123482770	PLANNING_CENTER
215	Jessica	Peterson	jessz_peterson@hotmail.com	(504) 717-1691	f	2025-05-03 19:33:56.599302	2025-05-10 19:08:40.962		40829937	123482771	PLANNING_CENTER
227	Brad	Sanders	bsanders@vbar.com	\N	f	2025-05-03 19:33:57.246494	2025-05-10 19:08:42.27		40829937	123482783	PLANNING_CENTER
228	Brent	Rose	brentrose504@gmail.com	(504) 296-3777	f	2025-05-03 19:33:57.289068	2025-05-10 19:08:42.359		40829937	123482784	PLANNING_CENTER
230	Jesse	Sanders	\N	\N	f	2025-05-03 19:33:57.377344	2025-05-10 19:08:42.561		40829937	123482786	PLANNING_CENTER
231	Shannon	Sanders	shannonwsanders@yahoo.com	(504) 577-6556	f	2025-05-03 19:33:57.418944	2025-05-10 19:08:42.656		40829937	123482787	PLANNING_CENTER
232	Abbey	Sanders	\N	\N	f	2025-05-03 19:33:57.460608	2025-05-10 19:08:42.772		40829937	123482788	PLANNING_CENTER
234	Katrina	Schilling	4schillings@gmail.com	(601) 408-5819	f	2025-05-03 19:33:57.552398	2025-05-10 19:08:42.983		40829937	123482790	PLANNING_CENTER
235	Garin	Siekkinen	garin1147@yahoo.com	(504) 352-4929	f	2025-05-03 19:33:57.593854	2025-05-10 19:08:43.093		40829937	123482791	PLANNING_CENTER
236	Gloria	Siekkinen	\N	\N	f	2025-05-03 19:33:57.635985	2025-05-10 19:08:43.213		40829937	123482792	PLANNING_CENTER
238	Emily	Siekkinen	emilysiekkinen@gmail.com	(504) 351-4201	f	2025-05-03 19:33:57.873628	2025-05-10 19:08:43.404		40829937	123482794	PLANNING_CENTER
239	Simon	Siekkinen	\N	\N	f	2025-05-03 19:33:57.921597	2025-05-10 19:08:43.501		40829937	123482795	PLANNING_CENTER
240	Drew	Siekkinen	\N	\N	f	2025-05-03 19:33:57.968802	2025-05-10 19:08:43.595		40829937	123482796	PLANNING_CENTER
242	Kamron Jake	Simon	\N	\N	f	2025-05-03 19:33:58.061701	2025-05-10 19:08:43.788		40829937	123482798	PLANNING_CENTER
243	Luke	Sirinides	lukesirinides@gmail.com	(504) 258-0497	f	2025-05-03 19:33:58.108626	2025-05-10 19:08:43.886		40829937	123482799	PLANNING_CENTER
245	Pierson	Tallman	\N	\N	f	2025-05-03 19:33:58.202641	2025-05-10 19:08:44.098		40829937	123482801	PLANNING_CENTER
246	Tyler	Tallman	dspiteself@gmail.com	(337) 205-2142	f	2025-05-03 19:33:58.249284	2025-05-10 19:08:44.198		40829937	123482802	PLANNING_CENTER
247	Tim	Traycoff	ttraycoff@gmail.com	(317) 450-3276	f	2025-05-03 19:33:58.301065	2025-05-10 19:08:44.304		40829937	123482803	PLANNING_CENTER
248	Dylan	Turner	dylanfield@gmail.com	(504) 858-4799	f	2025-05-03 19:33:58.348695	2025-05-10 19:08:44.398		40829937	123482804	PLANNING_CENTER
250	Scott	Verret	spv504@yahoo.com	(504) 382-8353	f	2025-05-03 19:33:58.447161	2025-05-10 19:08:44.633		40829937	123482808	PLANNING_CENTER
251	Barry	Verdon	barrybernardverdon@gmail.com	\N	f	2025-05-03 19:33:58.502882	2025-05-10 19:08:44.739		40829937	123482809	PLANNING_CENTER
252	Tina	Verret	tina.verret@yahoo.com	(504) 301-5738	f	2025-05-03 19:33:58.552385	2025-05-10 19:08:44.846		40829937	123482811	PLANNING_CENTER
253	Christopher	Wappel	cwappel@joneswalker.com	(504) 914-4233	f	2025-05-03 19:33:58.599502	2025-05-10 19:08:44.961		40829937	123482812	PLANNING_CENTER
254	Beth	Watkins	beth1817@bellsouth.net	(504) 430-0878	f	2025-05-03 19:33:58.648829	2025-05-10 19:08:45.228		40829937	123482813	PLANNING_CENTER
255	Bijou	Watkins	\N	\N	f	2025-05-03 19:33:58.695977	2025-05-10 19:08:45.372		40829937	123482814	PLANNING_CENTER
258	Isabelle	Watkins	\N	\N	f	2025-05-03 19:33:58.974121	2025-05-10 19:08:45.76		40829937	123482817	PLANNING_CENTER
259	Joseph	Watkins	\N	\N	f	2025-05-03 19:33:59.021112	2025-05-10 19:08:45.861		40829937	123482818	PLANNING_CENTER
260	Joey	Watkins	joeywatkinsim@hotmail.com	(504) 458-5995	f	2025-05-03 19:33:59.064612	2025-05-10 19:08:45.962		40829937	123482819	PLANNING_CENTER
261	Josephine	Watkins	\N	\N	f	2025-05-03 19:33:59.116938	2025-05-10 19:08:46.067		40829937	123482820	PLANNING_CENTER
263	Cate	Whitworth	\N	\N	f	2025-05-03 19:33:59.205776	2025-05-10 19:08:46.255		40829937	123482822	PLANNING_CENTER
264	Charlotte	Whitworth	\N	\N	f	2025-05-03 19:33:59.251151	2025-05-10 19:08:46.346		40829937	123482823	PLANNING_CENTER
265	Nel	Whitworth	\N	\N	f	2025-05-03 19:33:59.295218	2025-05-10 19:08:46.438		40829937	123482824	PLANNING_CENTER
267	Buck	Williams	emwilliams3@yahoo.com	(404) 290-0613	f	2025-05-03 19:33:59.381765	2025-05-10 19:08:46.643		40829937	123482826	PLANNING_CENTER
268	Joe	Willis	loboregal@hotmail.com	(609) 206-4411	f	2025-05-03 19:33:59.428496	2025-05-10 19:08:46.745		40829937	123482827	PLANNING_CENTER
269	Paula	Willis	sunrisepbj@yahoo.com	(609) 203-9576	f	2025-05-03 19:33:59.477215	2025-05-10 19:08:46.842		40829937	123482828	PLANNING_CENTER
270	Charlotte	Woolf	\N	\N	f	2025-05-03 19:33:59.52285	2025-05-10 19:08:46.942		40829937	123482829	PLANNING_CENTER
271	Vance	Woolf	vancewoolf@hotmail.com	(504) 453-6669	f	2025-05-03 19:33:59.568274	2025-05-10 19:08:47.037		40829937	123482830	PLANNING_CENTER
273	Will	Woolf	\N	\N	f	2025-05-03 19:33:59.656236	2025-05-10 19:08:47.231		40829937	123482832	PLANNING_CENTER
274	Anne Elizabeth	Zegel	aezegel@gmail.com	(601) 863-6122	f	2025-05-03 19:33:59.699592	2025-05-10 19:08:47.326		40829937	123482833	PLANNING_CENTER
275	Daniel	Zegel	dzegel1@gmail.com	(615) 456-2496	f	2025-05-03 19:33:59.745335	2025-05-10 19:08:47.426		40829937	123482835	PLANNING_CENTER
276	Corina	Zapata	caatsy@yahoo.com	\N	f	2025-05-03 19:33:59.790233	2025-05-10 19:08:47.566		40829937	123482836	PLANNING_CENTER
278	Pauline S	Cook	pscook51@gmail.com	\N	f	2025-05-03 19:33:59.87719	2025-05-10 19:08:47.762		40829937	125726928	PLANNING_CENTER
279	Dominic	Rizzo	\N	\N	f	2025-05-03 19:33:59.921012	2025-05-10 19:08:47.861		40829937	125755711	PLANNING_CENTER
280	Ethan	Payne	\N	\N	f	2025-05-03 19:33:59.964583	2025-05-10 19:08:47.957		40829937	125882727	PLANNING_CENTER
281	Charles	Payne	\N	\N	f	2025-05-03 19:34:00.013006	2025-05-10 19:08:48.05		40829937	125882728	PLANNING_CENTER
282	Daryl John	Payne	xing105dj@gmail.com	\N	f	2025-05-03 19:34:00.059179	2025-05-10 19:08:48.15		40829937	126039133	PLANNING_CENTER
284	Lacy	Modica	lacyvgarrett@gmail.com	(478) 718-7909	f	2025-05-03 19:34:00.145139	2025-05-10 19:08:48.465		40829937	126637806	PLANNING_CENTER
285	Thomas	Downs	thomasrdowns@gmail.com	(251) 233-8501	f	2025-05-03 19:34:00.189016	2025-05-10 19:08:48.597		40829937	126679978	PLANNING_CENTER
286	Mary	Jones	mjones52@tulane.edu	(770) 231-0586	f	2025-05-03 19:34:00.232295	2025-05-10 19:08:48.728		40829937	128938476	PLANNING_CENTER
288	Merrick	McCool	merrickmccool@gmail.com	(662) 832-2773	f	2025-05-03 19:34:00.319673	2025-05-10 19:08:48.96		40829937	132646906	PLANNING_CENTER
289	Omar	Hamid	omariqbal.hamid@gmail.com	(504) 975-5310	f	2025-05-03 19:34:00.362958	2025-05-10 19:08:49.062		40829937	133059999	PLANNING_CENTER
290	Megan	Waterston	mwaterston09@gmail.com	(214) 725-1216	f	2025-05-03 19:34:00.408097	2025-05-10 19:08:49.17		40829937	133393404	PLANNING_CENTER
293	Ellie Sue	Downs	\N	\N	f	2025-05-03 19:34:00.538961	2025-05-10 19:08:49.469		40829937	134494773	PLANNING_CENTER
294	Jetta Mae	Downs	\N	\N	f	2025-05-03 19:34:00.58232	2025-05-10 19:08:49.561		40829937	134494805	PLANNING_CENTER
295	Katherine	Sharp	sharpsustainability@gmail.com	\N	f	2025-05-03 19:34:00.627989	2025-05-10 19:08:49.654		40829937	137188024	PLANNING_CENTER
223	David	Rizzo	davidrizzo@gmail.com	(504) 621-2048	f	2025-05-03 19:33:57.080627	2025-05-10 19:08:41.783		40829937	123482779	PLANNING_CENTER
224	Grace	Thacker	gracethacker@gmail.com	(504) 478-6663	f	2025-05-03 19:33:57.122701	2025-05-10 19:08:41.909		40829937	123482780	PLANNING_CENTER
225	Matt	Roelofs	matt.roelofs@ruf.org	(901) 438-5007	f	2025-05-03 19:33:57.163542	2025-05-10 19:08:42.034		40829937	123482781	PLANNING_CENTER
226	Jackie	Roelofs	jackieroelofs@gmail.com	(850) 324-5094	f	2025-05-03 19:33:57.204471	2025-05-10 19:08:42.174		40829937	123482782	PLANNING_CENTER
339	Frances Josephine	Baker	\N	\N	f	2025-05-10 14:05:28.3	2025-05-10 19:08:21.193	\N	40829937	123482562	PLANNING_CENTER
340	Lizzie	Barnes	\N	\N	f	2025-05-10 14:05:28.857	2025-05-10 19:08:21.549	\N	40829937	123482566	PLANNING_CENTER
341	Rachel	Barnes	\N	\N	f	2025-05-10 14:05:29.304	2025-05-10 19:08:21.731	\N	40829937	123482568	PLANNING_CENTER
342	Ella	Baumgarten	\N	\N	f	2025-05-10 14:05:29.417	2025-05-10 19:08:21.824	\N	40829937	123482569	PLANNING_CENTER
343	John	Baumgarten	\N	\N	f	2025-05-10 14:05:29.665	2025-05-10 19:08:22.183	\N	40829937	123482571	PLANNING_CENTER
344	Emily	Baumgarten	\N	\N	f	2025-05-10 14:05:29.764	2025-05-10 19:08:22.405	\N	40829937	123482572	PLANNING_CENTER
33	Leslie	Beery	lesliebeery@gmail.com	504-430-3483	f	2025-05-03 19:33:48.415682	2025-05-10 19:08:22.857		40829937	123482576	PLANNING_CENTER
345	Jack	Beery	\N	\N	f	2025-05-10 14:05:30.772	2025-05-10 19:08:23.176	\N	40829937	123482579	PLANNING_CENTER
346	Grace	Brady	\N	\N	f	2025-05-10 14:05:31.194	2025-05-10 19:08:23.455	\N	40829937	123482582	PLANNING_CENTER
347	James	Brady	\N	\N	f	2025-05-10 14:05:31.446	2025-05-10 19:08:23.639	\N	40829937	123482584	PLANNING_CENTER
348	Jay	Brady	\N	\N	f	2025-05-10 14:05:31.543	2025-05-10 19:08:23.728	\N	40829937	123482585	PLANNING_CENTER
43	Kelsey	Brand	kelscab@gmail.com	225-803-4467	f	2025-05-03 19:33:48.867525	2025-05-10 19:08:23.818		40829937	123482586	PLANNING_CENTER
349	Emily	Breen	\N	\N	f	2025-05-10 14:05:32.007	2025-05-10 19:08:23.999	\N	40829937	123482588	PLANNING_CENTER
350	Heidi	Cabell	\N	\N	f	2025-05-10 14:05:32.515	2025-05-10 19:08:24.365	\N	40829937	123482592	PLANNING_CENTER
50	Crystal Clem	Campbell	cmclem@gmail.com	619-218-4304	f	2025-05-03 19:33:49.188714	2025-05-10 19:08:24.458		40829937	123482593	PLANNING_CENTER
351	Finn	Campbell	\N	\N	f	2025-05-10 14:05:32.746	2025-05-10 19:08:24.557	\N	40829937	123482594	PLANNING_CENTER
352	Archie	Campbell	\N	\N	f	2025-05-10 14:05:32.99	2025-05-10 19:08:24.738	\N	40829937	123482596	PLANNING_CENTER
353	Audra	Carey	\N	\N	f	2025-05-10 14:05:33.527	2025-05-10 19:08:25.345	\N	40829937	123482600	PLANNING_CENTER
59	Kelley	Carey	mkelleycarey@gmail.com	314-603-5905	f	2025-05-03 19:33:49.614566	2025-05-10 19:08:25.641		40829937	123482602	PLANNING_CENTER
354	Miles	Cook	\N	\N	f	2025-05-10 14:05:34.326	2025-05-10 19:08:26.066	\N	40829937	123482606	PLANNING_CENTER
355	Jonah	Cothran	\N	\N	f	2025-05-10 14:05:34.421	2025-05-10 19:08:26.155	\N	40829937	123482607	PLANNING_CENTER
66	Samuel	Cook	samuel.marc.cook@gmail.com	240-461-1957	f	2025-05-03 19:33:49.943377	2025-05-10 19:08:26.34		40829937	123482609	PLANNING_CENTER
356	Gracie	Cothran	\N	\N	f	2025-05-10 14:05:34.796	2025-05-10 19:08:26.429	\N	40829937	123482610	PLANNING_CENTER
357	Hadley	Cothran	\N	\N	f	2025-05-10 14:05:34.891	2025-05-10 19:08:26.519	\N	40829937	123482612	PLANNING_CENTER
73	Patsey	Crews	patseycrews@gmail.com	8327711301	f	2025-05-03 19:33:50.25642	2025-05-10 19:08:26.969		40829937	123482617	PLANNING_CENTER
296	Vince	D	Vjdthird@yahoo.com	(504) 315-8665	f	2025-05-03 19:34:00.671368	2025-05-10 19:08:49.745		40829937	137702586	PLANNING_CENTER
297	Mya	Jackson	mya.jackson9149@yahoo.com	(251) 406-0015	f	2025-05-03 19:34:00.714608	2025-05-10 19:08:49.835		40829937	137904233	PLANNING_CENTER
298	Phillip	Gray	bushwickphill@icloud.com	\N	f	2025-05-03 19:34:00.75838	2025-05-10 19:08:49.925		40829937	138772424	PLANNING_CENTER
299	Ella	Maki	\N	\N	f	2025-05-03 19:34:00.801872	2025-05-10 19:08:50.022		40829937	140682426	PLANNING_CENTER
300	Nellie Gray	Maki	\N	\N	f	2025-05-03 19:34:00.845198	2025-05-10 19:08:50.142		40829937	140682427	PLANNING_CENTER
338	Savannah	Apple	\N	\N	f	2025-05-10 14:05:28.051	2025-05-10 19:08:21.013	\N	40829937	123482560	PLANNING_CENTER
301	Peter	Davis	\N	\N	f	2025-05-03 19:34:00.889186	2025-05-10 19:08:50.239		40829937	142204026	PLANNING_CENTER
302	Cora	Kessler	\N	\N	f	2025-05-03 19:34:00.932881	2025-05-10 19:08:50.334		40829937	142205765	PLANNING_CENTER
304	Pauline	Ordeneaux	\N	\N	f	2025-05-03 19:34:01.020331	2025-05-10 19:08:50.537		40829937	142206075	PLANNING_CENTER
306	Martha Miller	Ordeneaux	\N	\N	f	2025-05-03 19:34:01.107104	2025-05-10 19:08:50.786		40829937	142206154	PLANNING_CENTER
307	Reed	Roelofs	\N	\N	f	2025-05-03 19:34:01.150439	2025-05-10 19:08:50.887		40829937	142206233	PLANNING_CENTER
309	David	Fiegel	\N	\N	f	2025-05-03 19:34:01.236858	2025-05-10 19:08:51.076		40829937	144380913	PLANNING_CENTER
310	Hannah	Schmucker	hsschmucker@gmail.com	(610) 551-0786	f	2025-05-03 19:34:01.280616	2025-05-10 19:08:51.166		40829937	144505270	PLANNING_CENTER
312	Chase	Hunsicker	chasehunsicker@gmail.com	(678) 551-1896	f	2025-05-03 19:34:01.366984	2025-05-10 19:08:51.358		40829937	145418355	PLANNING_CENTER
313	Brandon	Rojas	\N	\N	f	2025-05-03 19:34:01.409213	2025-05-10 19:08:51.452		40829937	147259584	PLANNING_CENTER
314	Melanie	Word	melanie.word@ruf.org	(662) 379-3363	f	2025-05-03 19:34:01.453408	2025-05-10 19:08:51.55		40829937	147393579	PLANNING_CENTER
315	Charlotte	Curtis	\N	\N	f	2025-05-03 19:34:01.497034	2025-05-10 19:08:51.646		40829937	148140667	PLANNING_CENTER
316	Bodynk	M	michael.saklc@hotmail.com	\N	f	2025-05-03 19:34:01.540216	2025-05-10 19:08:51.74		40829937	148369008	PLANNING_CENTER
318	Leighton	McCool	leightonwmccool@gmail.com	(662) 832-2771	f	2025-05-03 19:34:01.62654	2025-05-10 19:08:52.092		40829937	152239917	PLANNING_CENTER
319	James	Wakeland	jmw930@gmail.com	(832) 566-4362	f	2025-05-03 19:34:01.669604	2025-05-10 19:08:52.288		40829937	154302928	PLANNING_CENTER
320	Erika	Brent	erika.brent12@gmail.com	(504) 439-1410	f	2025-05-03 19:34:01.712986	2025-05-10 19:08:52.437		40829937	154308867	PLANNING_CENTER
321	Rob	Brent	\N	\N	f	2025-05-03 19:34:01.756649	2025-05-10 19:08:52.548		40829937	154459204	PLANNING_CENTER
322	Ryan	Brent	\N	\N	f	2025-05-03 19:34:01.801559	2025-05-10 19:08:52.661		40829937	154459228	PLANNING_CENTER
324	Karey	Coleman	kandpcoleman@comcast.net	(615) 406-6655	f	2025-05-03 19:34:01.889751	2025-05-10 19:08:52.869		40829937	155411492	PLANNING_CENTER
326	Alexander	Schmidt	\N	\N	f	2025-05-03 19:34:01.983279	2025-05-10 19:08:53.078		40829937	157121661	PLANNING_CENTER
327	Gil	Schmidt	gilschmidt89@gmail.com	(205) 535-2267	f	2025-05-03 19:34:02.029292	2025-05-10 19:08:53.197		40829937	157121765	PLANNING_CENTER
328	Lise	Coetzee	lcoetzee@tulane.edu	(504) 877-1359	f	2025-05-03 19:34:02.075404	2025-05-10 19:08:53.305		40829937	159372471	PLANNING_CENTER
329	Kepha	Mwangi	kephamwangi@gmail.com	\N	f	2025-05-03 19:34:02.12127	2025-05-10 19:08:53.415		40829937	164982230	PLANNING_CENTER
330	Elsie	Elliot	\N	\N	f	2025-05-03 19:34:02.164606	2025-05-10 19:08:53.525		40829937	165149615	PLANNING_CENTER
332	Shepherd	Longmire	\N	\N	f	2025-05-03 19:34:02.253349	2025-05-10 19:08:53.747		40829937	165150033	PLANNING_CENTER
333	Jonathan	Somma	jondsomma@gmail.com	(914) 793-3599	f	2025-05-03 19:34:02.296741	2025-05-10 19:08:53.858		40829937	165545303	PLANNING_CENTER
334	Nicole	Somma	nssomma@gmail.com	\N	f	2025-05-03 19:34:02.340947	2025-05-10 19:08:53.969		40829937	165545343	PLANNING_CENTER
8	Ray	Cannata	ray@redeemernola.com	‭(504) 458-5920‬	f	2025-05-03 19:33:47.294509	2025-05-10 19:08:20.144		40829937	123352503	PLANNING_CENTER
336	Adelaide	Adams	\N	\N	f	2025-05-10 14:05:27.129	2025-05-10 19:08:20.362	\N	40829937	123482552	PLANNING_CENTER
14	Tom	Anton	tsanton@citcom.net	734-968-3398	f	2025-05-03 19:33:47.564064	2025-05-10 19:08:20.735		40829937	123482557	PLANNING_CENTER
337	Patrick	Apple	\N	\N	f	2025-05-10 14:05:27.817	2025-05-10 19:08:20.823	\N	40829937	123482558	PLANNING_CENTER
361	Mary Frances	Dunaway	\N	\N	f	2025-05-10 14:05:38.294	2025-05-10 19:08:28.803	\N	40829937	123482636	PLANNING_CENTER
362	Ellie	Dunaway	\N	\N	f	2025-05-10 14:05:38.388	2025-05-10 19:08:28.955	\N	40829937	123482637	PLANNING_CENTER
363	Georgia	Dunaway	\N	\N	f	2025-05-10 14:05:38.481	2025-05-10 19:08:29.095	\N	40829937	123482638	PLANNING_CENTER
364	Finn	Elliot	\N	\N	f	2025-05-10 14:05:38.576	2025-05-10 19:08:29.196	\N	40829937	123482639	PLANNING_CENTER
365	Liles	Elliot	\N	\N	f	2025-05-10 14:05:38.945	2025-05-10 19:08:29.49	\N	40829937	123482642	PLANNING_CENTER
366	Mark	Ellison	\N	\N	f	2025-05-10 14:05:39.038	2025-05-10 19:08:29.581	\N	40829937	123482643	PLANNING_CENTER
101	Lee	Ellison	plellisonjr@me.com	843-408-3882	f	2025-05-03 19:33:51.509842	2025-05-10 19:08:29.763		40829937	123482645	PLANNING_CENTER
378	Arden	Hales	\N	\N	f	2025-05-10 14:35:40.391	2025-05-10 19:08:30.764	\N	40829937	123482658	PLANNING_CENTER
379	Aidan	Hales	\N	\N	f	2025-05-10 14:35:40.483	2025-05-10 19:08:30.854	\N	40829937	123482659	PLANNING_CENTER
382	Sam	Harmon	\N	\N	f	2025-05-10 14:35:40.756	2025-05-10 19:08:31.122	\N	40829937	123482662	PLANNING_CENTER
384	Jack	Harmon	\N	\N	f	2025-05-10 14:35:40.94	2025-05-10 19:08:31.302	\N	40829937	123482664	PLANNING_CENTER
386	Vivian	Harrell	\N	\N	f	2025-05-10 14:35:41.125	2025-05-10 19:08:31.482	\N	40829937	123482667	PLANNING_CENTER
388	Charles	Harrell	\N	\N	f	2025-05-10 14:35:41.308	2025-05-10 19:08:31.661	\N	40829937	123482669	PLANNING_CENTER
396	Margaret	Hubbel	\N	\N	f	2025-05-10 14:35:42.043	2025-05-10 19:08:32.739	\N	40829937	123482678	PLANNING_CENTER
406	Iver	Jones	\N	\N	f	2025-05-10 14:35:42.963	2025-05-10 19:08:33.673	\N	40829937	123482691	PLANNING_CENTER
408	Mae	Jones	\N	\N	f	2025-05-10 14:35:43.173	2025-05-10 19:08:33.854	\N	40829937	123482693	PLANNING_CENTER
409	Chloe	Klump	\N	\N	f	2025-05-10 14:35:43.278	2025-05-10 19:08:33.943	\N	40829937	123482694	PLANNING_CENTER
410	Lena	Jones	\N	\N	f	2025-05-10 14:35:43.379	2025-05-10 19:08:34.032	\N	40829937	123482695	PLANNING_CENTER
414	Zachery	Klump	\N	\N	f	2025-05-10 14:35:43.76	2025-05-10 19:08:34.403	\N	40829937	123482699	PLANNING_CENTER
416	Ashley Lynn	Klump	\N	\N	f	2025-05-10 14:35:43.944	2025-05-10 19:08:34.582	\N	40829937	123482701	PLANNING_CENTER
417	Arthur	Knapp	\N	\N	f	2025-05-10 14:35:44.035	2025-05-10 19:08:34.673	\N	40829937	123482702	PLANNING_CENTER
418	Petra	Knapp	\N	\N	f	2025-05-10 14:35:44.128	2025-05-10 19:08:34.762	\N	40829937	123482703	PLANNING_CENTER
367	Testerly	Jones	testerlyjones@me.com	\N	f	2025-05-10 14:26:04.483	2025-05-10 19:08:54.185	\N	40829937	168997899	PLANNING_CENTER
1	John	Spivey	jmspivey@icloud.com	(601) 720-7207	f	2025-05-03 16:13:31.088313	2025-05-10 19:08:19.563	\N	40829937	123321877	PLANNING_CENTER
22	Anna Gray	Baker	ag.macmurphy@gmail.com	843-864-9831	f	2025-05-03 19:33:47.920758	2025-05-10 19:08:21.46		40829937	123482565	PLANNING_CENTER
358	Reynolds	Davis	\N	\N	f	2025-05-10 14:05:35.93	2025-05-10 19:08:27.147	\N	40829937	123482619	PLANNING_CENTER
76	Crawford	Crews	crawford.crews@gmail.com	\N	f	2025-05-03 19:33:50.391804	2025-05-10 19:08:27.236		40829937	123482620	PLANNING_CENTER
78	Julia	Davis	juliatrechsel@gmail.com	205-807-3171	f	2025-05-03 19:33:50.480468	2025-05-10 19:08:27.418		40829937	123482622	PLANNING_CENTER
359	Sam	Davis	\N	\N	f	2025-05-10 14:05:36.631	2025-05-10 19:08:27.595	\N	40829937	123482624	PLANNING_CENTER
360	Archie	Davis	\N	\N	f	2025-05-10 14:05:37.063	2025-05-10 19:08:27.861	\N	40829937	123482627	PLANNING_CENTER
85	Laura	DiRosa	lhdirosa@gmail.com	(504) 330-0668	f	2025-05-03 19:33:50.792273	2025-05-10 19:08:28.047		40829937	123482629	PLANNING_CENTER
90	Matt	Drury	mdrury@tulane.edu	\N	f	2025-05-03 19:33:51.013627	2025-05-10 19:08:28.527		40829937	123482634	PLANNING_CENTER
436	Van	LaPlante	\N	\N	f	2025-05-10 14:35:45.785	2025-05-10 19:08:36.661	\N	40829937	123482721	PLANNING_CENTER
438	Charlie	LaPlante	\N	\N	f	2025-05-10 14:35:45.969	2025-05-10 19:08:36.838	\N	40829937	123482723	PLANNING_CENTER
440	Phillip	Longmire	\N	\N	f	2025-05-10 14:35:46.15	2025-05-10 19:08:37.018	\N	40829937	123482725	PLANNING_CENTER
444	Oliver	Longmire	\N	\N	f	2025-05-10 14:35:46.552	2025-05-10 19:08:37.379	\N	40829937	123482730	PLANNING_CENTER
123	Kevin	Harrell	harrekt@gmail.com	(251) 294-3764	f	2025-05-03 19:33:52.494028	2025-05-10 19:08:31.794		40829937	123482670	PLANNING_CENTER
125	Jennifer	Harris	jsulsu@yahoo.com	(352) 870-4153	f	2025-05-03 19:33:52.582613	2025-05-10 19:08:32.156		40829937	123482672	PLANNING_CENTER
128	Lisa	Hearne	\N	(319) 654-5748	f	2025-05-03 19:33:52.716017	2025-05-10 19:08:32.552		40829937	123482676	PLANNING_CENTER
129	Martin	Hearne	mmhearne@mac.com	(319) 551-0130	f	2025-05-03 19:33:52.760006	2025-05-10 19:08:32.651		40829937	123482677	PLANNING_CENTER
446	Henry	MacGowan	\N	\N	f	2025-05-10 14:35:46.736	2025-05-10 19:08:37.557	\N	40829937	123482732	PLANNING_CENTER
448	Eleanor	MacGowan	\N	\N	f	2025-05-10 14:35:46.92	2025-05-10 19:08:37.735	\N	40829937	123482734	PLANNING_CENTER
136	John-Michael	Johnson	mj.nodevco@gmail.com	(318) 613-4307	f	2025-05-03 19:33:53.070647	2025-05-10 19:08:33.285		40829937	123482687	PLANNING_CENTER
138	Megan	Johnson	megan.washack@gmail.com	\N	f	2025-05-03 19:33:53.158374	2025-05-10 19:08:33.461		40829937	123482689	PLANNING_CENTER
139	Jeremy	Jones	jeremy.david.jones@gmail.com	(504) 418-7410	f	2025-05-03 19:33:53.203228	2025-05-10 19:08:33.554		40829937	123482690	PLANNING_CENTER
141	Kristen	Jones	kristin.mosely@gmail.com	(504) 655-0372	f	2025-05-03 19:33:53.291699	2025-05-10 19:08:33.764		40829937	123482692	PLANNING_CENTER
145	Kim	Kessler	kedombrowski@gmail.com	(225) 316-0359	f	2025-05-03 19:33:53.468432	2025-05-10 19:08:34.122		40829937	123482696	PLANNING_CENTER
420	Carson	Koffler	\N	\N	f	2025-05-10 14:35:44.315	2025-05-10 19:08:35.037	\N	40829937	123482705	PLANNING_CENTER
423	Charles	Korndorffer	\N	\N	f	2025-05-10 14:35:44.588	2025-05-10 19:08:35.471	\N	40829937	123482708	PLANNING_CENTER
158	Kelly	Koffler	kellykoffler@gmail.com	(504) 330-3007	f	2025-05-03 19:33:54.043046	2025-05-10 19:08:35.561		40829937	123482709	PLANNING_CENTER
426	Avery	Kostrzewa	\N	\N	f	2025-05-10 14:35:44.861	2025-05-10 19:08:35.758	\N	40829937	123482711	PLANNING_CENTER
428	Olive	Kostrzewa	\N	\N	f	2025-05-10 14:35:45.044	2025-05-10 19:08:35.936	\N	40829937	123482713	PLANNING_CENTER
429	Eliza	Kostrzewa	\N	\N	f	2025-05-10 14:35:45.142	2025-05-10 19:08:36.026	\N	40829937	123482714	PLANNING_CENTER
430	Vivian	Lanier	\N	\N	f	2025-05-10 14:35:45.239	2025-05-10 19:08:36.116	\N	40829937	123482715	PLANNING_CENTER
165	Megan	Krause	aryaeragon97@gmail.com	(504) 452-7592	f	2025-05-03 19:33:54.354533	2025-05-10 19:08:36.205		40829937	123482716	PLANNING_CENTER
432	Megan	Lanier	\N	\N	f	2025-05-10 14:35:45.421	2025-05-10 19:08:36.302	\N	40829937	123482717	PLANNING_CENTER
186	Lili	Maki	liliwallace1991@gmail.com	(615) 293-5535	f	2025-05-03 19:33:55.29515	2025-05-10 19:08:38.159		40829937	123482738	PLANNING_CENTER
454	Evan	May	\N	\N	f	2025-05-10 14:35:47.48	2025-05-10 19:08:38.442	\N	40829937	123482740	PLANNING_CENTER
457	Michael	McNulty	\N	\N	f	2025-05-10 14:35:47.795	2025-05-10 19:08:38.733	\N	40829937	123482743	PLANNING_CENTER
462	Austin	Mohlenbrok	\N	\N	f	2025-05-10 14:35:48.256	2025-05-10 19:08:39.182	\N	40829937	123482748	PLANNING_CENTER
200	Liz	Fiegel	elizabethamurphy28@gmail.com	(601) 519-9382	f	2025-05-03 19:33:55.924779	2025-05-10 19:08:39.549		40829937	123482752	PLANNING_CENTER
201	Madeline	Moot	madelinezelenka@gmail.com	(985) 502-5687	f	2025-05-03 19:33:55.971228	2025-05-10 19:08:39.646		40829937	123482753	PLANNING_CENTER
102	Jep	Epstein	jep@scoremusic.com	(504) 722-9237	f	2025-05-03 19:33:51.554275	2025-05-10 19:08:29.854		40829937	123482646	PLANNING_CENTER
103	Jeanne	Faucheux	jeanne.faucheux@gmail.com	(504) 913-5665	f	2025-05-03 19:33:51.598289	2025-05-10 19:08:29.945		40829937	123482647	PLANNING_CENTER
105	Lucy	Ferguson	lucyferguson@btinternet.com	(832) 718-7609	f	2025-05-03 19:33:51.687289	2025-05-10 19:08:30.127		40829937	123482649	PLANNING_CENTER
121	Katelyn	Harrell	katelynharrell@gmail.com	(504) 261-5065	f	2025-05-03 19:33:52.404763	2025-05-10 19:08:31.571		40829937	123482668	PLANNING_CENTER
434	Ivy	Kostrzewa	\N	\N	f	2025-05-10 14:35:45.603	2025-05-10 19:08:36.481	\N	40829937	123482719	PLANNING_CENTER
435	BJ	Lanier	\N	\N	f	2025-05-10 14:35:45.693	2025-05-10 19:08:36.571	\N	40829937	123482720	PLANNING_CENTER
317	Sara Caitlin	Ritsch	saracritsch@gmail.com	\N	f	2025-05-03 19:34:01.583304	2025-05-10 19:08:51.893		40829937	149051969	PLANNING_CENTER
323	Mary	Brent	\N	\N	f	2025-05-03 19:34:01.844416	2025-05-10 19:08:52.763		40829937	154459239	PLANNING_CENTER
325	Sarah	Schmidt	skpschmidt@gmail.com	(352) 470-6294	f	2025-05-03 19:34:01.934215	2025-05-10 19:08:52.975		40829937	156218220	PLANNING_CENTER
114	Robert	Hamilton	rbh721@gmail.com	(512) 944-2312	f	2025-05-03 19:33:52.095472	2025-05-10 19:08:30.943		40829937	123482660	PLANNING_CENTER
194	Troy	Meredith	tman84675@gmail.com	\N	f	2025-05-03 19:33:55.651227	2025-05-10 19:08:39.001		40829937	123482746	PLANNING_CENTER
195	Patricia	Meredith	patriciameredith219@yahoo.com	(504) 272-4088	f	2025-05-03 19:33:55.695036	2025-05-10 19:08:39.091		40829937	123482747	PLANNING_CENTER
241	Brittany Tillery	Simon	\N	\N	f	2025-05-03 19:33:58.015508	2025-05-10 19:08:43.693		40829937	123482797	PLANNING_CENTER
244	Megan	Tallman	megan.n.lindsey@gmail.com	(337) 258-1307	f	2025-05-03 19:33:58.155402	2025-05-10 19:08:43.99		40829937	123482800	PLANNING_CENTER
249	Sabra	Turner	sabra.matheny@gmail.com	(985) 351-1720	f	2025-05-03 19:33:58.396177	2025-05-10 19:08:44.516		40829937	123482806	PLANNING_CENTER
277	Audrey	Portillo Recinos	agportillorecinos@gmail.com	(626) 261-1807	f	2025-05-03 19:33:59.83369	2025-05-10 19:08:47.667		40829937	125659005	PLANNING_CENTER
283	Cara Elizabeth “Cece”	Woolf	\N	\N	f	2025-05-03 19:34:00.102548	2025-05-10 19:08:48.314		40829937	126438613	PLANNING_CENTER
287	Tiffany	Adler	etadler@yahoo.com	(504) 583-9908	f	2025-05-03 19:34:00.27629	2025-05-10 19:08:48.856		40829937	130980436	PLANNING_CENTER
291	Preston	McWilliams	michaelprestonmcwilliams@gmail.com	(601) 596-3212	f	2025-05-03 19:34:00.452306	2025-05-10 19:08:49.282		40829937	133983700	PLANNING_CENTER
331	River	Roelofs	\N	\N	f	2025-05-03 19:34:02.20766	2025-05-10 19:08:53.638		40829937	165149807	PLANNING_CENTER
335	James	Monayo	james.monayo@trinitasinternationalschool.sc.ke	\N	f	2025-05-03 19:34:02.385217	2025-05-10 19:08:54.079		40829937	167235966	PLANNING_CENTER
115	Toy	Harmon	toyoferrall@gmail.com	(504) 330-7792	f	2025-05-03 19:33:52.139796	2025-05-10 19:08:31.033		40829937	123482661	PLANNING_CENTER
197	Meredith	McInturff	mcmcinturff@gmail.com	(859) 213-0217	f	2025-05-03 19:33:55.784302	2025-05-10 19:08:39.274		40829937	123482749	PLANNING_CENTER
470	Kenneth	Watkins	\N	\N	f	2025-05-10 15:31:56.815	2025-05-10 19:08:45.53	\N	40829937	123482815	PLANNING_CENTER
292	Laurel	Downs	laurelrdowns@gmail.com	(504) 250-6865	f	2025-05-03 19:34:00.495458	2025-05-10 19:08:49.375		40829937	134494658	PLANNING_CENTER
303	Aaron	Kessler	\N	\N	f	2025-05-03 19:34:00.976291	2025-05-10 19:08:50.433		40829937	142205866	PLANNING_CENTER
308	Blair	Fiegel	\N	\N	f	2025-05-03 19:34:01.193563	2025-05-10 19:08:50.982		40829937	144380783	PLANNING_CENTER
311	Marybeth	McBain	mcbain.marybeth@gmail.com	(281) 928-9512	f	2025-05-03 19:34:01.323619	2025-05-10 19:08:51.265		40829937	144739545	PLANNING_CENTER
119	Solomon	Haroon	woodsonleigh78@gmail.com	(504) 289-4059	f	2025-05-03 19:33:52.315923	2025-05-10 19:08:31.39		40829937	123482665	PLANNING_CENTER
127	Neil	Harris	cbharri2@gmail.com	\N	f	2025-05-03 19:33:52.671437	2025-05-10 19:08:32.436		40829937	123482675	PLANNING_CENTER
134	Mike	Hugele	mikehugele@gmail.com	(832) 418-6129	f	2025-05-03 19:33:52.982231	2025-05-10 19:08:33.108		40829937	123482685	PLANNING_CENTER
135	Rankin	Hunter	rankinhunter21@gmail.com	\N	f	2025-05-03 19:33:53.026458	2025-05-10 19:08:33.197		40829937	123482686	PLANNING_CENTER
147	Pate	Kessler	pate.kessler@gmail.com	(225) 276-0112	f	2025-05-03 19:33:53.556214	2025-05-10 19:08:34.307		40829937	123482698	PLANNING_CENTER
153	Stephanie	Knapp	sakstoecker@gmail.com	(530) 400-1684	f	2025-05-03 19:33:53.821583	2025-05-10 19:08:34.892		40829937	123482704	PLANNING_CENTER
159	Melanie	Korndorffer	mkorndor@gmail.com	(504) 451-6757;(504) 451-6758	f	2025-05-03 19:33:54.087363	2025-05-10 19:08:35.655		40829937	123482710	PLANNING_CENTER
161	Melanie	Kostrzewa	rhoads.melanie@gmail.com	(504) 452-2881	f	2025-05-03 19:33:54.176162	2025-05-10 19:08:35.847		40829937	123482712	PLANNING_CENTER
171	Paul	Lapeyre	grampaul1@cox.net	(504) 343-3529	f	2025-05-03 19:33:54.620683	2025-05-10 19:08:36.75		40829937	123482722	PLANNING_CENTER
173	Zach	LaPlante	ezl13@yahoo.com	(571) 235-7935	f	2025-05-03 19:33:54.708712	2025-05-10 19:08:36.926		40829937	123482724	PLANNING_CENTER
176	Natalie	Longmire	longmire.natalie@gmail.com	(205) 401-0116	f	2025-05-03 19:33:54.841248	2025-05-10 19:08:37.196		40829937	123482728	PLANNING_CENTER
179	Wade	Longmire	walongmire@gmail.com	(615) 430-8462	f	2025-05-03 19:33:54.973642	2025-05-10 19:08:37.469		40829937	123482731	PLANNING_CENTER
187	Mike	Marshall	mike@turnservices.com	(504) 218-3472	f	2025-05-03 19:33:55.341721	2025-05-10 19:08:38.324		40829937	123482739	PLANNING_CENTER
199	Samual	Moot	samual.r.moot@gmail.com	(504) 952-7533	f	2025-05-03 19:33:55.872249	2025-05-10 19:08:39.452		40829937	123482751	PLANNING_CENTER
468	Raul	Ramos	\N	\N	f	2025-05-10 15:31:51.993	2025-05-10 19:08:41.648	\N	40829937	123482778	PLANNING_CENTER
229	Monica	Rose	mrose@rhousela.org	(504) 339-6257	f	2025-05-03 19:33:57.331297	2025-05-10 19:08:42.463		40829937	123482785	PLANNING_CENTER
233	Sarah	Satterlee	satterlee.sarah@gmail.com	(985) 264-1418	f	2025-05-03 19:33:57.505607	2025-05-10 19:08:42.871		40829937	123482789	PLANNING_CENTER
469	Matt	Schilling	\N	\N	f	2025-05-10 15:31:54.172	2025-05-10 19:08:43.314	\N	40829937	123482793	PLANNING_CENTER
257	Jill	Watkins	jschliesser@aol.com	(504) 458-2160	f	2025-05-03 19:33:58.93094	2025-05-10 19:08:45.639		40829937	123482816	PLANNING_CENTER
262	Ben	Whitworth	benjamin.whitworth@icloud.com	(904) 652-8107	f	2025-05-03 19:33:59.160899	2025-05-10 19:08:46.166		40829937	123482821	PLANNING_CENTER
266	Jessica	Whitworth	jessicagwhitworth@gmail.com	(904) 524-3567	f	2025-05-03 19:33:59.338542	2025-05-10 19:08:46.531		40829937	123482825	PLANNING_CENTER
272	Cara	Woolf	caralainemccool@hotmail.com	(504) 715-0818	f	2025-05-03 19:33:59.612441	2025-05-10 19:08:47.14		40829937	123482831	PLANNING_CENTER
\.


--
-- Data for Name: planning_center_tokens; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.planning_center_tokens (id, user_id, church_id, access_token, refresh_token, expires_at, created_at, updated_at) FROM stdin;
2	\N	\N	pco_tok_6d7f0262632bb49915278f01d07ba5a80dbe84d23743ffd30ebc933c1471834d12417286	720e725cb6c12cf214860e418ab12592952802907f486848db8c8a6defb879d3	2025-05-09 22:12:27.866	2025-05-09 20:12:35.785	2025-05-09 20:12:35.785
3	\N	\N	pco_tok_1764eff58e171c66396d6d7d64fa6f37419aaea2b66251552ac4af8cdf6d83027ebe9915	b7da63e04fc7fd7a3910444f29b76163b1e2723bb6ec787b89a16be424bf090b	2025-05-09 22:45:09.102	2025-05-09 20:45:13.468	2025-05-09 20:45:13.468
4	\N	\N	pco_tok_6d807d136a03cfe405d6b04a700f8a2cd0d415b007766da8cf9a02358dcc0c89ae265c0f	44687731037423e06c22ac0d9f226ea6130cd9edb9e5c3cc3875caa88c352851	2025-05-09 22:46:25.06	2025-05-09 20:46:29.492	2025-05-09 20:46:29.492
5	\N	\N	pco_tok_2f313183d9bec2941e884f56be272a904f9f8d153c7396ebbfb804f828c436d5acbcc333	67f05a17a7d1098aa001e123903763b7ebdc22f7b280a70470d4d9a384a691e5	2025-05-09 23:02:59.552	2025-05-09 21:03:04.675	2025-05-09 21:03:04.675
6	\N	\N	pco_tok_465483c40d27f76285f34c22522a30b6e02c439544e4a531c2f872d9b976488d8f6a58f4	45f0e4911e623c2bdd5a1237367b3f3b590ae6cd3c432a96113fb41255802f48	2025-05-09 23:03:13.685	2025-05-09 21:03:18.632	2025-05-09 21:03:18.632
7	\N	\N	pco_tok_3de80797e69b289db35742ff18ebfb19cfcf4bb8124b2748bbf2cd2af10cc3c1cfac8ef5	a0c793c7f704bf51a5be52d1af99c4b12099fedc4af7aa6c31b147d6d5562b11	2025-05-10 01:45:18.384	2025-05-09 23:45:23.065	2025-05-09 23:45:23.065
8	\N	\N	pco_tok_294cd156025fca1b21fcbb99adefec95d0775b6b8b4ca0230a5ac1ea9841108855e7e50e	37a70bf3238e18736550a9ab6d984fa000975f83247a795f55649a04df6d3f3b	2025-05-10 15:30:36.561	2025-05-10 13:30:45.015	2025-05-10 13:30:45.015
24	40829937	40829937	pco_tok_eb4fb6fbccd609454c9592ae4e115882cf7ed1643f96eb6ac55086ae5c24c6ba42040480	c2d04e817e2c666b57a1b23d7d5350b7f5d18f174aeb1eadcf38b5c8643ae3af	2025-05-10 20:37:25.057	2025-05-10 18:37:25.253	2025-05-10 19:08:54.242
13	644128517	644128517	pco_tok_5ce76aa0c5738bce1b3599b0d3aa5b68a97da37873581d5ccd114038cf01199dc8748750	67c3a6a3dc1d93414816abc5cc1b1b479debb2984df8a881b98bd5931eee95e3	2025-05-10 18:24:03.322	2025-05-10 16:02:37.778	2025-05-10 16:24:03.515
\.


--
-- Data for Name: report_recipients; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.report_recipients (id, first_name, last_name, email, church_id, created_at, updated_at) FROM stdin;
3	John	Spivey	jmspivey@icloud.com	40829937	2025-05-04 22:25:10.132049	2025-05-04 22:25:10.132049
\.


--
-- Data for Name: service_options; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.service_options (id, name, value, is_default, created_at, updated_at, church_id) FROM stdin;
1	Morning Service	morning-service	t	2025-05-04 01:29:20.680443	2025-05-04 21:00:09.78	40829937
3	Crawfish Boil	crawfish-boil	f	2025-05-04 22:24:51.234956	2025-05-04 22:24:51.234956	40829937
\.


--
-- Data for Name: sessions; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.sessions (sid, sess, expire) FROM stdin;
X5-nmmmp8G4Cdb6_pmuGNWYiq6WS6iKD	{"cookie": {"path": "/", "secure": true, "expires": "2025-05-15T18:00:09.428Z", "httpOnly": true, "originalMaxAge": 604800000}, "passport": {"user": {"claims": {"sub": "40829937", "email": "jspivey@spiveyco.com", "username": "jspivey@spiveyco.com"}}}}	2025-05-15 18:14:01
dD7X5Fo2Kp0bwOaA3imAZkK2f0fOkRkB	{"cookie": {"path": "/", "secure": true, "expires": "2025-05-13T18:39:07.554Z", "httpOnly": true, "originalMaxAge": 604800000}, "passport": {"user": {"claims": {"aud": "2ff4ba9d-bd8c-4ea0-83d3-33bd83ea2669", "bio": null, "exp": 1746560347, "iat": 1746556747, "iss": "https://replit.com/oidc", "sub": "40829937", "email": "jspivey@spiveyco.com", "at_hash": "8PshwISH1fJKGOdqtJgF_g", "username": "jspivey", "auth_time": 1746543481, "last_name": "Spivey", "first_name": "John"}, "expires_at": 1746560347, "access_token": "i_ePTLKQMtbF-DWJ2EjVBsYmTDVVkPTIV2wC5QFpC6a", "refresh_token": "TNqNJht6WcDINWPpjWzr2YZDjQ1q5JuH2NGhtgqxiQn"}}}	2025-05-13 18:53:06
fNjsZ9OBZAUI0K1nWRtCEkJTFVm9KQRz	{"cookie": {"path": "/", "secure": true, "expires": "2025-05-16T15:01:59.308Z", "httpOnly": true, "originalMaxAge": 604800000}, "passport": {"user": {"claims": {"sub": "40829937", "email": "jspivey@spiveyco.com", "username": "jspivey@spiveyco.com"}}}}	2025-05-16 15:02:09
sLyqLyeH5RG7xqmlO_mjhiBvahb3eWnZ	{"cookie": {"path": "/", "secure": true, "expires": "2025-05-13T14:57:42.189Z", "httpOnly": true, "originalMaxAge": 604800000}, "replit.com": {"code_verifier": "0vOWcrq8mDFWw7SJHUqTwU1W8S2DdW1dAatv6SfcEtg"}}	2025-05-13 21:03:28
7N9pskAxU63jcrWru8mJ4AwPH0awvxdw	{"cookie": {"path": "/", "secure": true, "expires": "2025-05-13T16:12:18.118Z", "httpOnly": true, "originalMaxAge": 604799999}, "passport": {"user": {"claims": {"aud": "2ff4ba9d-bd8c-4ea0-83d3-33bd83ea2669", "bio": null, "exp": 1746551537, "iat": 1746547937, "iss": "https://replit.com/oidc", "sub": "40829937", "email": "jspivey@spiveyco.com", "at_hash": "GWa9zKIaSaFF9kHTypAamA", "username": "jspivey", "auth_time": 1746481069, "last_name": "Spivey", "first_name": "John"}, "expires_at": 1746551537, "access_token": "ziR9pzxcUqf1Y5BjIKNLeSWCLo-xC16zVsvEudffgXD", "refresh_token": "PFgqFjBhWU1vxgbUJFebOlKneb7aPcEbNw6HkseC7bQ"}}}	2025-05-13 16:12:21
9hKweuHKC7JolTYTz5uCBSrJspPjPJK5	{"cookie": {"path": "/", "secure": true, "expires": "2025-05-17T18:39:02.774Z", "httpOnly": true, "originalMaxAge": 604800000}, "passport": {"user": {"id": "40829937", "claims": {"sub": "40829937", "email": "jspivey@spiveyco.com", "username": "jspivey@spiveyco.com"}, "churchId": "40829937"}}}	2025-05-17 19:02:29
1_7Ozln3X1Zl9PkCA-WorncErtaFOkv6	{"cookie": {"path": "/", "secure": true, "expires": "2025-05-17T18:22:06.147Z", "httpOnly": true, "originalMaxAge": 604800000}, "passport": {"user": {"id": "40829937", "claims": {"sub": "40829937", "email": "jspivey@spiveyco.com", "username": "jspivey@spiveyco.com"}, "churchId": "40829937"}}}	2025-05-17 18:37:33
Mxg1aeHM7CQSElQYSsyujD9z9hqgWvGV	{"cookie": {"path": "/", "secure": true, "expires": "2025-05-13T17:12:44.595Z", "httpOnly": true, "originalMaxAge": 604800000}, "passport": {"user": {"claims": {"aud": "2ff4ba9d-bd8c-4ea0-83d3-33bd83ea2669", "bio": null, "exp": 1746555164, "iat": 1746551564, "iss": "https://replit.com/oidc", "sub": "40829937", "email": "jspivey@spiveyco.com", "at_hash": "f9rK8QB1ebRewBAbaXopKw", "username": "jspivey", "auth_time": 1746399673, "last_name": "Spivey", "first_name": "John"}, "expires_at": 1746555164, "access_token": "OF2P1QFEVqocbL6hoW8cI1zEtXb7or2Um7CxNDRUioa", "refresh_token": "ONdQdDabgbbrFOiXfvsHcCqm374nV7bBkUJRTJ4INSn"}}}	2025-05-13 17:12:57
TzjV1T318c6UZrHqsgVPcQ2JXFQoRUoQ	{"cookie": {"path": "/", "secure": true, "expires": "2025-05-17T17:49:32.516Z", "httpOnly": true, "originalMaxAge": 604800000}, "passport": {"user": {"id": "40829937", "claims": {"sub": "40829937", "email": "jspivey@spiveyco.com", "username": "jspivey@spiveyco.com"}, "churchId": "40829937"}}, "planningCenterState": "bb88abba2aa42535b4148b37c742cb875687c0a20564d425", "planningCenterUserId": "40829937", "planningCenterChurchId": "40829937"}	2025-05-17 17:49:40
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.users (id, username, email, first_name, last_name, bio, profile_image_url, created_at, updated_at, church_name, email_notifications_enabled, role, password_reset_token, password_reset_expires, password, is_verified, church_logo_url, church_id, is_master_admin) FROM stdin;
726523227	johnmspivey7_1	johnmspivey7@gmail.com	Test	Usher	\N	\N	2025-05-08 16:54:07.099	2025-05-08 17:14:04.877	\N	t	USHER	\N	\N	6adf6272831460dbc3881abe2bf7c6c9dca7edf2317284864e2dab21d3c1c33d09f02c9b911e99b5ac9851941384d60be07e0a812f803c5b0b055802b6ec53f1:6f7ae4ef3e9eba8da1cab9b729e4389d	t	\N	40829937	f
644128517	jmspivey_1	jmspivey@icloud.com	Miller	Spivey	\N	\N	2025-05-06 17:09:51.329	2025-05-08 21:32:55.073	\N	t	ADMIN	6d9fe10440e0b7ff42cf01e833b90ee6314dba04495f4167919cebf181c33a47	2025-05-08 22:32:55.073+00	08eee842385f80fbeb6fb74d416bdb67b39fa2a7e6462ea187f4ecb57dcc4673b269e951e83801cfe135b3f9b13b7df1c58ee26828fccfeb91d877a3556761d2:cbbd10d0151785bfe9c6f046052059f3	t	\N	644128517	f
922299005	jmspivey	INACTIVE_INACTIVE_jmspivey@icloud.com	John	Spivey	\N	\N	2025-05-05 02:28:43.374	2025-05-08 15:40:53.323	\N	t	USHER	\N	\N	24a236b2b0158571f591b803054eee021e3f4c6e72b65cca4766feb5cc251f6a283fd63f886aa70096eeee3554c8fb94115055600677d3e7c2ccf63a8419d3cc:7e698ebb8a6fec2ca404f59ced4d53b1	t	\N	644128517	f
40829937	jspivey	jspivey@spiveyco.com	John	Spivey	\N	/avatars/avatar-1746332089971-772508694.jpg	2025-05-03 16:12:46.139118	2025-05-08 15:40:53.375	Redeemer Presbyterian Church	t	ADMIN	\N	\N	79085899b5b303036329bfe1f06175ea9f105380df4b697fd229a2cdce74e8982450266764b674ec6d02d7e528943fd77602c70c63023a9a04c9e48a54dc45a8:c7b7dd5d4cfbbf223e1b3b92e73034b3	t	/logos/church-logo-1746624068927-525000162.png	40829937	t
423399918	johnmspivey7	INACTIVE_johnmspivey7@gmail.com	Google	Usher	\N	\N	2025-05-06 20:43:59.962	2025-05-08 16:50:15.235	\N	t	USHER	d84b59d1ae8c3b94fa6ad9afe2215bb2c52bd02fe5fe494dbc9e945ec6520650	2025-05-08 20:43:59.918+00	\N	f	\N	\N	f
\.


--
-- Name: batches_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.batches_id_seq', 118, true);


--
-- Name: donations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.donations_id_seq', 191, true);


--
-- Name: email_templates_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.email_templates_id_seq', 8, true);


--
-- Name: members_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.members_id_seq', 470, true);


--
-- Name: planning_center_tokens_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.planning_center_tokens_id_seq', 24, true);


--
-- Name: report_recipients_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.report_recipients_id_seq', 4, true);


--
-- Name: service_options_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.service_options_id_seq', 5, true);


--
-- Name: batches batches_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.batches
    ADD CONSTRAINT batches_pkey PRIMARY KEY (id);


--
-- Name: donations donations_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.donations
    ADD CONSTRAINT donations_pkey PRIMARY KEY (id);


--
-- Name: email_templates email_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.email_templates
    ADD CONSTRAINT email_templates_pkey PRIMARY KEY (id);


--
-- Name: members members_email_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.members
    ADD CONSTRAINT members_email_unique UNIQUE (email);


--
-- Name: members members_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.members
    ADD CONSTRAINT members_pkey PRIMARY KEY (id);


--
-- Name: planning_center_tokens planning_center_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.planning_center_tokens
    ADD CONSTRAINT planning_center_tokens_pkey PRIMARY KEY (id);


--
-- Name: planning_center_tokens planning_center_tokens_user_id_church_id_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.planning_center_tokens
    ADD CONSTRAINT planning_center_tokens_user_id_church_id_key UNIQUE (user_id, church_id);


--
-- Name: report_recipients report_recipients_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.report_recipients
    ADD CONSTRAINT report_recipients_pkey PRIMARY KEY (id);


--
-- Name: service_options service_options_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.service_options
    ADD CONSTRAINT service_options_pkey PRIMARY KEY (id);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (sid);


--
-- Name: users users_email_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_unique UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_unique UNIQUE (username);


--
-- Name: IDX_session_expire; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "IDX_session_expire" ON public.sessions USING btree (expire);


--
-- Name: batches batches_attestation_confirmed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.batches
    ADD CONSTRAINT batches_attestation_confirmed_by_fkey FOREIGN KEY (attestation_confirmed_by) REFERENCES public.users(id);


--
-- Name: batches batches_church_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.batches
    ADD CONSTRAINT batches_church_id_users_id_fk FOREIGN KEY (church_id) REFERENCES public.users(id);


--
-- Name: batches batches_primary_attestor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.batches
    ADD CONSTRAINT batches_primary_attestor_id_fkey FOREIGN KEY (primary_attestor_id) REFERENCES public.users(id);


--
-- Name: batches batches_secondary_attestor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.batches
    ADD CONSTRAINT batches_secondary_attestor_id_fkey FOREIGN KEY (secondary_attestor_id) REFERENCES public.users(id);


--
-- Name: donations donations_batch_id_batches_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.donations
    ADD CONSTRAINT donations_batch_id_batches_id_fk FOREIGN KEY (batch_id) REFERENCES public.batches(id);


--
-- Name: donations donations_church_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.donations
    ADD CONSTRAINT donations_church_id_users_id_fk FOREIGN KEY (church_id) REFERENCES public.users(id);


--
-- Name: donations donations_member_id_members_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.donations
    ADD CONSTRAINT donations_member_id_members_id_fk FOREIGN KEY (member_id) REFERENCES public.members(id);


--
-- Name: members members_church_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.members
    ADD CONSTRAINT members_church_id_users_id_fk FOREIGN KEY (church_id) REFERENCES public.users(id);


--
-- Name: planning_center_tokens planning_center_tokens_church_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.planning_center_tokens
    ADD CONSTRAINT planning_center_tokens_church_id_fkey FOREIGN KEY (church_id) REFERENCES public.users(id);


--
-- Name: planning_center_tokens planning_center_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.planning_center_tokens
    ADD CONSTRAINT planning_center_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: report_recipients report_recipients_church_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.report_recipients
    ADD CONSTRAINT report_recipients_church_id_fkey FOREIGN KEY (church_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: service_options service_options_church_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.service_options
    ADD CONSTRAINT service_options_church_id_users_id_fk FOREIGN KEY (church_id) REFERENCES public.users(id);


--
-- Name: users users_church_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_church_id_fkey FOREIGN KEY (church_id) REFERENCES public.users(id);


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: cloud_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO neon_superuser WITH GRANT OPTION;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: cloud_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT ALL ON TABLES TO neon_superuser WITH GRANT OPTION;


--
-- PostgreSQL database dump complete
--

