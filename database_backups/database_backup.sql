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
    church_id character varying
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

COPY public.members (id, first_name, last_name, email, phone, is_visitor, created_at, updated_at, notes, church_id) FROM stdin;
1	John	Spivey	jmspivey@icloud.com	601-720-7207	f	2025-05-03 16:13:31.088313	2025-05-03 16:13:31.088313	\N	40829937
3	Olga	Spivey	olgaspivey@me.com	(601) 720-4399	f	2025-05-03 19:33:47.061095	2025-05-03 19:33:47.061095		40829937
4	Olga Wright	Spivey	owspivey@me.com	(615) 957-1726	f	2025-05-03 19:33:47.11569	2025-05-03 19:33:47.11569		40829937
5	Daniel	Spivey	daspivey37@outlook.com	(601) 500-0346	f	2025-05-03 19:33:47.160509	2025-05-03 19:33:47.160509		40829937
6	Jason	Cabell	jason.cabell@gmail.com	(601) 209-0581	f	2025-05-03 19:33:47.205243	2025-05-03 19:33:47.205243		40829937
7	Hannah	Cabell	hannah@redeemernola.com	(504) 214-8142	f	2025-05-03 19:33:47.249792	2025-05-03 19:33:47.249792		40829937
8	Ray	Cannata	ray@redeemernola.com	(504) 458-5920	f	2025-05-03 19:33:47.294509	2025-05-03 19:33:47.294509		40829937
9	Ken	Kostrzewa	ken@redeemernola.com	(504) 388-5948	f	2025-05-03 19:33:47.339126	2025-05-03 19:33:47.339126		40829937
10	Adelaide	Adams	\N	\N	f	2025-05-03 19:33:47.384634	2025-05-03 19:33:47.384634		40829937
11	Ben	Apple	donmanzana@gmail.com	(843) 521-7683	f	2025-05-03 19:33:47.429684	2025-05-03 19:33:47.429684		40829937
12	Sandi	Anton	sranton1953@gmail.com	(734) 968-3458	f	2025-05-03 19:33:47.474548	2025-05-03 19:33:47.474548		40829937
13	Virginia	Apple	virginia.apple@gmail.com	(834) 521-7685	f	2025-05-03 19:33:47.519191	2025-05-03 19:33:47.519191		40829937
14	Tom	Anton	tsanton@citcom.net	(734) 968-3398	f	2025-05-03 19:33:47.564064	2025-05-03 19:33:47.564064		40829937
15	Patrick	Apple	\N	\N	f	2025-05-03 19:33:47.609579	2025-05-03 19:33:47.609579		40829937
16	Katie	Adams	katie_e.walsh@yahoo.com	(850) 339-3459	f	2025-05-03 19:33:47.653868	2025-05-03 19:33:47.653868		40829937
17	Savannah	Apple	\N	\N	f	2025-05-03 19:33:47.698578	2025-05-03 19:33:47.698578		40829937
18	Noah	Atwi	noah.atwi@gmail.com	(337) 501-3918	f	2025-05-03 19:33:47.741945	2025-05-03 19:33:47.741945		40829937
19	Frances Josephine	Baker	\N	\N	f	2025-05-03 19:33:47.786501	2025-05-03 19:33:47.786501		40829937
20	Cindy Sun	Atwi	csun1895@gmail.com	(630) 328-3301	f	2025-05-03 19:33:47.830891	2025-05-03 19:33:47.830891		40829937
21	Ralph	Baker	ralph.baker0@gmail.com	(803) 351-1126	f	2025-05-03 19:33:47.875982	2025-05-03 19:33:47.875982		40829937
22	Anna Gray	Baker	ag.macmurphy@gmail.com	(843) 864-9831	f	2025-05-03 19:33:47.920758	2025-05-03 19:33:47.920758		40829937
23	Lizzie	Barnes	\N	\N	f	2025-05-03 19:33:47.964768	2025-05-03 19:33:47.964768		40829937
24	Patty	Barnes	plbcpa@fmbcci.com	(504) 481-3817	f	2025-05-03 19:33:48.011727	2025-05-03 19:33:48.011727		40829937
25	Rachel	Barnes	\N	\N	f	2025-05-03 19:33:48.056188	2025-05-03 19:33:48.056188		40829937
26	Ella	Baumgarten	\N	\N	f	2025-05-03 19:33:48.100594	2025-05-03 19:33:48.100594		40829937
27	Jeff	Baumgarten	jeffreybaumgarten@me.com	(504) 919-7537	f	2025-05-03 19:33:48.145164	2025-05-03 19:33:48.145164		40829937
28	John	Baumgarten	\N	\N	f	2025-05-03 19:33:48.191448	2025-05-03 19:33:48.191448		40829937
29	Emily	Baumgarten	\N	\N	f	2025-05-03 19:33:48.236899	2025-05-03 19:33:48.236899		40829937
30	Amy Hill	Beebe	amylee83@gmail.com	\N	f	2025-05-03 19:33:48.281454	2025-05-03 19:33:48.281454		40829937
31	Jon	Beebe	jonbb96@yahoo.com	\N	f	2025-05-03 19:33:48.326071	2025-05-03 19:33:48.326071		40829937
32	Clay	Beery	cbeery@laitram.com	(504) 210-9696	f	2025-05-03 19:33:48.370549	2025-05-03 19:33:48.370549		40829937
33	Leslie	Beery	lesliebeery@gmail.com	(504) 430-3483	f	2025-05-03 19:33:48.415682	2025-05-03 19:33:48.415682		40829937
34	Julia	Beery	jhbeery@gmail.com	(504) 722-4831	f	2025-05-03 19:33:48.460727	2025-05-03 19:33:48.460727		40829937
35	Travis	Bonaventure	bcpfinishes@gmail.com	(504) 408-5279	f	2025-05-03 19:33:48.505208	2025-05-03 19:33:48.505208		40829937
36	Jack	Beery	\N	\N	f	2025-05-03 19:33:48.54964	2025-05-03 19:33:48.54964		40829937
37	Elbert	Bivins	jelbertbivins@gmail.com	(601) 566-3711	f	2025-05-03 19:33:48.594317	2025-05-03 19:33:48.594317		40829937
38	Betty	Bivins	bettybivins@gmail.com	(601) 918-3581	f	2025-05-03 19:33:48.638584	2025-05-03 19:33:48.638584		40829937
39	Grace	Brady	\N	\N	f	2025-05-03 19:33:48.683808	2025-05-03 19:33:48.683808		40829937
40	Caroline	Brady	carolinebrady@cox.net	(504) 452-8736	f	2025-05-03 19:33:48.734351	2025-05-03 19:33:48.734351		40829937
41	James	Brady	\N	\N	f	2025-05-03 19:33:48.778882	2025-05-03 19:33:48.778882		40829937
42	Jay	Brady	\N	\N	f	2025-05-03 19:33:48.823376	2025-05-03 19:33:48.823376		40829937
43	Kelsey	Brand	kelscab@gmail.com	(225) 803-4467	f	2025-05-03 19:33:48.867525	2025-05-03 19:33:48.867525		40829937
44	William	Brand	billbrand22@gmail.com	(601) 278-4438	f	2025-05-03 19:33:48.913561	2025-05-03 19:33:48.913561		40829937
45	Emily	Breen	\N	\N	f	2025-05-03 19:33:48.966881	2025-05-03 19:33:48.966881		40829937
46	Andrew	Breen	andrew.n.breen@gmail.com	(703) 400-1252	f	2025-05-03 19:33:49.011899	2025-05-03 19:33:49.011899		40829937
47	Ann	Breen	eannbreen@gmail.com	(202) 251-9551	f	2025-05-03 19:33:49.056376	2025-05-03 19:33:49.056376		40829937
48	Benjamin	Cabell	benji.cabell@icloud.com	\N	f	2025-05-03 19:33:49.100755	2025-05-03 19:33:49.100755		40829937
49	Heidi	Cabell	\N	\N	f	2025-05-03 19:33:49.143936	2025-05-03 19:33:49.143936		40829937
50	Crystal Clem	Campbell	cmclem@gmail.com	(619) 218-4304	f	2025-05-03 19:33:49.188714	2025-05-03 19:33:49.188714		40829937
51	Finn	Campbell	\N	\N	f	2025-05-03 19:33:49.233041	2025-05-03 19:33:49.233041		40829937
52	Todd	Campbell	farewelltofenway@yahoo.com	(337) 278-7234	f	2025-05-03 19:33:49.277298	2025-05-03 19:33:49.277298		40829937
53	Archie	Campbell	\N	\N	f	2025-05-03 19:33:49.323787	2025-05-03 19:33:49.323787		40829937
54	Andrew	Cannata	andrew449944@gmail.com	\N	f	2025-05-03 19:33:49.380094	2025-05-03 19:33:49.380094		40829937
55	Rachel	Cannata	rachel.cannata@hotmail.com	(504) 722-4067	f	2025-05-03 19:33:49.424238	2025-05-03 19:33:49.424238		40829937
56	Kathy	Cannata	cannata2@yahoo.com	(504) 458-4959	f	2025-05-03 19:33:49.47648	2025-05-03 19:33:49.47648		40829937
57	Audra	Carey	\N	\N	f	2025-05-03 19:33:49.521316	2025-05-03 19:33:49.521316		40829937
58	Josiah	Carey	josiah.carey@gmail.com	(434) 249-6633	f	2025-05-03 19:33:49.565855	2025-05-03 19:33:49.565855		40829937
59	Kelley	Carey	mkelleycarey@gmail.com	(314) 603-5905	f	2025-05-03 19:33:49.614566	2025-05-03 19:33:49.614566		40829937
60	Skip	Chandler	skip.chandler@reagan.com	(918) 237-0060	f	2025-05-03 19:33:49.6607	2025-05-03 19:33:49.6607		40829937
61	Nancy	Chandler	nchandler504@gmail.com	(918) 237-0061	f	2025-05-03 19:33:49.705898	2025-05-03 19:33:49.705898		40829937
62	Emily	Cook	emilycook2010@gmail.com	(540) 308-0807	f	2025-05-03 19:33:49.750892	2025-05-03 19:33:49.750892		40829937
63	Miles	Cook	\N	\N	f	2025-05-03 19:33:49.795255	2025-05-03 19:33:49.795255		40829937
64	Jonah	Cothran	\N	\N	f	2025-05-03 19:33:49.83927	2025-05-03 19:33:49.83927		40829937
65	Michael	Cook	mcook57@outlook.com	\N	f	2025-05-03 19:33:49.898385	2025-05-03 19:33:49.898385		40829937
66	Samuel	Cook	samuel.marc.cook@gmail.com	(240) 461-1957	f	2025-05-03 19:33:49.943377	2025-05-03 19:33:49.943377		40829937
67	Gracie	Cothran	\N	\N	f	2025-05-03 19:33:49.987418	2025-05-03 19:33:49.987418		40829937
68	Hadley	Cothran	\N	\N	f	2025-05-03 19:33:50.033259	2025-05-03 19:33:50.033259		40829937
69	Kim	Cothran	kim.cothran@gmail.com	(504) 421-0768	f	2025-05-03 19:33:50.077256	2025-05-03 19:33:50.077256		40829937
70	Ted	Cothran	ted.cothran@gmail.com	(504) 421-0945	f	2025-05-03 19:33:50.122948	2025-05-03 19:33:50.122948		40829937
71	Jesse	Cougle	jcougle@gmail.com	(850) 345-8488	f	2025-05-03 19:33:50.167477	2025-05-03 19:33:50.167477		40829937
72	Stephen	Cox	stephengreenthumb@gmail.com	(919) 610-2974	f	2025-05-03 19:33:50.211594	2025-05-03 19:33:50.211594		40829937
73	Patsey	Crews	patseycrews@gmail.com	(832) 771-1301	f	2025-05-03 19:33:50.25642	2025-05-03 19:33:50.25642		40829937
74	Maddie	Cox	mq.ciszewski@gmail.com	(202) 641-1879	f	2025-05-03 19:33:50.299944	2025-05-03 19:33:50.299944		40829937
75	Reynolds	Davis	\N	\N	f	2025-05-03 19:33:50.34421	2025-05-03 19:33:50.34421		40829937
76	Crawford	Crews	crawford.crews@gmail.com	\N	f	2025-05-03 19:33:50.391804	2025-05-03 19:33:50.391804		40829937
77	Chelsea	Crews	chelsmcole@gmail.com	\N	f	2025-05-03 19:33:50.436423	2025-05-03 19:33:50.436423		40829937
78	Julia	Davis	juliatrechsel@gmail.com	(205) 807-3171	f	2025-05-03 19:33:50.480468	2025-05-03 19:33:50.480468		40829937
79	Colby	Curtis	ccolby97@gmail.com	(601) 329-8555	f	2025-05-03 19:33:50.524911	2025-05-03 19:33:50.524911		40829937
80	Sam	Davis	\N	\N	f	2025-05-03 19:33:50.569557	2025-05-03 19:33:50.569557		40829937
81	Rawlins	Curtis	rawlins.biggs@gmail.com	(601) 260-1385	f	2025-05-03 19:33:50.61431	2025-05-03 19:33:50.61431		40829937
82	Christine	Davis	christinehayden1206@gmail.com	(205) 370-4432	f	2025-05-03 19:33:50.658757	2025-05-03 19:33:50.658757		40829937
83	Archie	Davis	\N	\N	f	2025-05-03 19:33:50.703386	2025-05-03 19:33:50.703386		40829937
84	Arthur	Davis	arthurpdavis@gmail.com	(601) 955-6061	f	2025-05-03 19:33:50.747937	2025-05-03 19:33:50.747937		40829937
85	Laura	DiRosa	lhdirosa@gmail.com	(504) 330-0668	f	2025-05-03 19:33:50.792273	2025-05-03 19:33:50.792273		40829937
86	Richie	DiRosa	asoridr@gmail.com	(504) 329-8180	f	2025-05-03 19:33:50.836931	2025-05-03 19:33:50.836931		40829937
87	Kathan	Dearman	kathandearman@gmail.com	(504) 615-6344	f	2025-05-03 19:33:50.880951	2025-05-03 19:33:50.880951		40829937
88	Jan	Douma	J.Douma@shell.com	(504) 301-8579	f	2025-05-03 19:33:50.925255	2025-05-03 19:33:50.925255		40829937
89	Lauren	Dunaway	laurenfutrell@gmail.com	(504) 715-9999	f	2025-05-03 19:33:50.969378	2025-05-03 19:33:50.969378		40829937
90	Matt	Drury	mdrury@tulane.edu	\N	f	2025-05-03 19:33:51.013627	2025-05-03 19:33:51.013627		40829937
91	Joe	Dunaway	joseph.dunaway@gmail.com	(504) 881-6612	f	2025-05-03 19:33:51.05818	2025-05-03 19:33:51.05818		40829937
92	Mary Frances	Dunaway	\N	\N	f	2025-05-03 19:33:51.102644	2025-05-03 19:33:51.102644		40829937
93	Ellie	Dunaway	\N	\N	f	2025-05-03 19:33:51.147294	2025-05-03 19:33:51.147294		40829937
94	Georgia	Dunaway	\N	\N	f	2025-05-03 19:33:51.192139	2025-05-03 19:33:51.192139		40829937
95	Finn	Elliot	\N	\N	f	2025-05-03 19:33:51.237306	2025-05-03 19:33:51.237306		40829937
96	Alexandria	Elliot	alexandriaelliot3@gmail.com	(334) 797-9972	f	2025-05-03 19:33:51.281465	2025-05-03 19:33:51.281465		40829937
97	Jorda	Elliot	jfelliot@gmail.com	(251) 753-2934	f	2025-05-03 19:33:51.325532	2025-05-03 19:33:51.325532		40829937
98	Liles	Elliot	\N	\N	f	2025-05-03 19:33:51.369894	2025-05-03 19:33:51.369894		40829937
99	Mark	Ellison	\N	\N	f	2025-05-03 19:33:51.414544	2025-05-03 19:33:51.414544		40829937
100	Bonney	Ellison	bonney331@aol.com	(601) 946-2109	f	2025-05-03 19:33:51.46352	2025-05-03 19:33:51.46352		40829937
101	Lee	Ellison	plellisonjr@me.com	(843) 408-3882	f	2025-05-03 19:33:51.509842	2025-05-03 19:33:51.509842		40829937
102	Jep	Epstein	jep@scoremusic.com	(504) 722-9237	f	2025-05-03 19:33:51.554275	2025-05-03 19:33:51.554275		40829937
103	Jeanne	Faucheux	jeanne.faucheux@gmail.com	(504) 913-5665	f	2025-05-03 19:33:51.598289	2025-05-03 19:33:51.598289		40829937
104	Ian	Ferguson	iangferguson@btinternet.com	(832) 833-5334	f	2025-05-03 19:33:51.642441	2025-05-03 19:33:51.642441		40829937
105	Lucy	Ferguson	lucyferguson@btinternet.com	(832) 718-7609	f	2025-05-03 19:33:51.687289	2025-05-03 19:33:51.687289		40829937
106	Eli	Fisher	efisher82@gmail.com	(518) 817-1172	f	2025-05-03 19:33:51.732072	2025-05-03 19:33:51.732072		40829937
107	Andrew	Fuglestad	andrewfuglestad@gmail.com	(218) 341-4311	f	2025-05-03 19:33:51.776524	2025-05-03 19:33:51.776524		40829937
108	Ashlee	Filkins	ashleefilkins@gmail.com	(210) 529-2555	f	2025-05-03 19:33:51.819849	2025-05-03 19:33:51.819849		40829937
109	Anushka	Ghosh	aghosh1@tulane.edu	(504) 388-1851	f	2025-05-03 19:33:51.864313	2025-05-03 19:33:51.864313		40829937
110	Ethan	Hales	ethancana@me.com	(504) 913-2827	f	2025-05-03 19:33:51.918191	2025-05-03 19:33:51.918191		40829937
111	Cana	Hales	canaamor@me.com	(504) 234-1737	f	2025-05-03 19:33:51.96255	2025-05-03 19:33:51.96255		40829937
112	Arden	Hales	\N	\N	f	2025-05-03 19:33:52.007324	2025-05-03 19:33:52.007324		40829937
113	Aidan	Hales	\N	\N	f	2025-05-03 19:33:52.05129	2025-05-03 19:33:52.05129		40829937
114	Robert	Hamilton	rbh721@gmail.com	(512) 944-2312	f	2025-05-03 19:33:52.095472	2025-05-03 19:33:52.095472		40829937
115	Toy	Harmon	toyoferrall@gmail.com	(504) 330-7792	f	2025-05-03 19:33:52.139796	2025-05-03 19:33:52.139796		40829937
116	Sam	Harmon	\N	\N	f	2025-05-03 19:33:52.184418	2025-05-03 19:33:52.184418		40829937
117	Doug	Harmon	blindwall@hotmail.com	(504) 220-0387	f	2025-05-03 19:33:52.228461	2025-05-03 19:33:52.228461		40829937
118	Jack	Harmon	\N	\N	f	2025-05-03 19:33:52.272864	2025-05-03 19:33:52.272864		40829937
119	Solomon	Haroon	woodsonleigh78@gmail.com	(504) 289-4059	f	2025-05-03 19:33:52.315923	2025-05-03 19:33:52.315923		40829937
120	Vivian	Harrell	\N	\N	f	2025-05-03 19:33:52.360197	2025-05-03 19:33:52.360197		40829937
121	Katelyn	Harrell	katelynharrell@gmail.com	(504) 261-5065	f	2025-05-03 19:33:52.404763	2025-05-03 19:33:52.404763		40829937
122	Charles	Harrell	\N	\N	f	2025-05-03 19:33:52.448785	2025-05-03 19:33:52.448785		40829937
123	Kevin	Harrell	harrekt@gmail.com	(251) 294-3764	f	2025-05-03 19:33:52.494028	2025-05-03 19:33:52.494028		40829937
124	Dan	Harris	danharrisdds@yahoo.com	(760) 213-2947	f	2025-05-03 19:33:52.53858	2025-05-03 19:33:52.53858		40829937
125	Jennifer	Harris	jsulsu@yahoo.com	(352) 870-4153	f	2025-05-03 19:33:52.582613	2025-05-03 19:33:52.582613		40829937
126	Ann Kirk	Harris	annkirkjacobs@gmail.com	(601) 754-2262	f	2025-05-03 19:33:52.626925	2025-05-03 19:33:52.626925		40829937
127	Neil	Harris	cbharri2@gmail.com	\N	f	2025-05-03 19:33:52.671437	2025-05-03 19:33:52.671437		40829937
128	Lisa	Hearne	\N	(319) 654-5748	f	2025-05-03 19:33:52.716017	2025-05-03 19:33:52.716017		40829937
129	Martin	Hearne	mmhearne@mac.com	(319) 551-0130	f	2025-05-03 19:33:52.760006	2025-05-03 19:33:52.760006		40829937
130	Margaret	Hubbel	\N	\N	f	2025-05-03 19:33:52.804252	2025-05-03 19:33:52.804252		40829937
131	Debi	Hugele	debihugele@gmail.com	(281) 467-7118	f	2025-05-03 19:33:52.848168	2025-05-03 19:33:52.848168		40829937
132	Jacob	Heaton	jheaton36@gmail.com	(352) 217-7155	f	2025-05-03 19:33:52.892122	2025-05-03 19:33:52.892122		40829937
133	Heather	Heaton	hryanfl@gmail.com	(407) 341-0558	f	2025-05-03 19:33:52.937873	2025-05-03 19:33:52.937873		40829937
134	Mike	Hugele	mikehugele@gmail.com	(832) 418-6129	f	2025-05-03 19:33:52.982231	2025-05-03 19:33:52.982231		40829937
135	Rankin	Hunter	rankinhunter21@gmail.com	\N	f	2025-05-03 19:33:53.026458	2025-05-03 19:33:53.026458		40829937
136	John-Michael	Johnson	mj.nodevco@gmail.com	(318) 613-4307	f	2025-05-03 19:33:53.070647	2025-05-03 19:33:53.070647		40829937
137	Harrison	Hunter	harrisonhunter27@gmail.com	\N	f	2025-05-03 19:33:53.113871	2025-05-03 19:33:53.113871		40829937
138	Megan	Johnson	megan.washack@gmail.com	\N	f	2025-05-03 19:33:53.158374	2025-05-03 19:33:53.158374		40829937
139	Jeremy	Jones	jeremy.david.jones@gmail.com	(504) 418-7410	f	2025-05-03 19:33:53.203228	2025-05-03 19:33:53.203228		40829937
140	Iver	Jones	\N	\N	f	2025-05-03 19:33:53.247351	2025-05-03 19:33:53.247351		40829937
141	Kristen	Jones	kristin.mosely@gmail.com	(504) 655-0372	f	2025-05-03 19:33:53.291699	2025-05-03 19:33:53.291699		40829937
142	Mae	Jones	\N	\N	f	2025-05-03 19:33:53.334889	2025-05-03 19:33:53.334889		40829937
143	Chloe	Klump	\N	\N	f	2025-05-03 19:33:53.378882	2025-05-03 19:33:53.378882		40829937
144	Lena	Jones	\N	\N	f	2025-05-03 19:33:53.423711	2025-05-03 19:33:53.423711		40829937
145	Kim	Kessler	kedombrowski@gmail.com	(225) 316-0359	f	2025-05-03 19:33:53.468432	2025-05-03 19:33:53.468432		40829937
146	David	Klump	klumpdavid@gmail.com	(504) 669-2226	f	2025-05-03 19:33:53.512305	2025-05-03 19:33:53.512305		40829937
147	Pate	Kessler	pate.kessler@gmail.com	(225) 276-0112	f	2025-05-03 19:33:53.556214	2025-05-03 19:33:53.556214		40829937
148	Zachery	Klump	\N	\N	f	2025-05-03 19:33:53.600349	2025-05-03 19:33:53.600349		40829937
149	Cameron	Kilpatrick	cameronkilpatrick@gmail.com	(706) 402-7821	f	2025-05-03 19:33:53.64431	2025-05-03 19:33:53.64431		40829937
150	Ashley Lynn	Klump	\N	\N	f	2025-05-03 19:33:53.688664	2025-05-03 19:33:53.688664		40829937
151	Arthur	Knapp	\N	\N	f	2025-05-03 19:33:53.733415	2025-05-03 19:33:53.733415		40829937
152	Petra	Knapp	\N	\N	f	2025-05-03 19:33:53.777321	2025-05-03 19:33:53.777321		40829937
153	Stephanie	Knapp	sakstoecker@gmail.com	(530) 400-1684	f	2025-05-03 19:33:53.821583	2025-05-03 19:33:53.821583		40829937
154	Carson	Koffler	\N	\N	f	2025-05-03 19:33:53.865768	2025-05-03 19:33:53.865768		40829937
155	Jamie	Koffler	paulkoffler@gmail.com	(504) 329-5574	f	2025-05-03 19:33:53.910378	2025-05-03 19:33:53.910378		40829937
156	Caroline	Korndorffer	ckorndor@gmail.com	(504) 330-0496	f	2025-05-03 19:33:53.954294	2025-05-03 19:33:53.954294		40829937
157	Charles	Korndorffer	\N	\N	f	2025-05-03 19:33:53.99876	2025-05-03 19:33:53.99876		40829937
158	Kelly	Koffler	kellykoffler@gmail.com	(504) 330-3007	f	2025-05-03 19:33:54.043046	2025-05-03 19:33:54.043046		40829937
159	Melanie	Korndorffer	mkorndor@gmail.com	(504) 451-6757;(504) 451-6758	f	2025-05-03 19:33:54.087363	2025-05-03 19:33:54.087363		40829937
160	Avery	Kostrzewa	\N	\N	f	2025-05-03 19:33:54.131309	2025-05-03 19:33:54.131309		40829937
161	Melanie	Kostrzewa	rhoads.melanie@gmail.com	(504) 452-2881	f	2025-05-03 19:33:54.176162	2025-05-03 19:33:54.176162		40829937
162	Olive	Kostrzewa	\N	\N	f	2025-05-03 19:33:54.220231	2025-05-03 19:33:54.220231		40829937
163	Eliza	Kostrzewa	\N	\N	f	2025-05-03 19:33:54.264244	2025-05-03 19:33:54.264244		40829937
164	Vivian	Lanier	\N	\N	f	2025-05-03 19:33:54.30966	2025-05-03 19:33:54.30966		40829937
165	Megan	Krause	aryaeragon97@gmail.com	(504) 452-7592	f	2025-05-03 19:33:54.354533	2025-05-03 19:33:54.354533		40829937
166	Megan	Lanier	\N	\N	f	2025-05-03 19:33:54.398829	2025-05-03 19:33:54.398829		40829937
167	Christie	LaPlante	Christie.laplante@yahoo.com	(210) 849-7991	f	2025-05-03 19:33:54.443012	2025-05-03 19:33:54.443012		40829937
168	Ivy	Kostrzewa	\N	\N	f	2025-05-03 19:33:54.48749	2025-05-03 19:33:54.48749		40829937
169	BJ	Lanier	\N	\N	f	2025-05-03 19:33:54.532383	2025-05-03 19:33:54.532383		40829937
170	Van	LaPlante	\N	\N	f	2025-05-03 19:33:54.576475	2025-05-03 19:33:54.576475		40829937
171	Paul	Lapeyre	grampaul1@cox.net	(504) 343-3529	f	2025-05-03 19:33:54.620683	2025-05-03 19:33:54.620683		40829937
172	Charlie	LaPlante	\N	\N	f	2025-05-03 19:33:54.664685	2025-05-03 19:33:54.664685		40829937
173	Zach	LaPlante	ezl13@yahoo.com	(571) 235-7935	f	2025-05-03 19:33:54.708712	2025-05-03 19:33:54.708712		40829937
174	Phillip	Longmire	\N	\N	f	2025-05-03 19:33:54.752844	2025-05-03 19:33:54.752844		40829937
175	Judy	Lapeyre	pjverret@cox.net	(504) 382-4457	f	2025-05-03 19:33:54.797447	2025-05-03 19:33:54.797447		40829937
176	Natalie	Longmire	longmire.natalie@gmail.com	(205) 401-0116	f	2025-05-03 19:33:54.841248	2025-05-03 19:33:54.841248		40829937
177	Jamie	Logan	JLogan7@tulane.edu	(601) 813-4611	f	2025-05-03 19:33:54.88528	2025-05-03 19:33:54.88528		40829937
178	Oliver	Longmire	\N	\N	f	2025-05-03 19:33:54.929402	2025-05-03 19:33:54.929402		40829937
179	Wade	Longmire	walongmire@gmail.com	(615) 430-8462	f	2025-05-03 19:33:54.973642	2025-05-03 19:33:54.973642		40829937
180	Henry	MacGowan	\N	\N	f	2025-05-03 19:33:55.018024	2025-05-03 19:33:55.018024		40829937
181	Hannah	MacGowan	hechotin@gmail.com	(985) 630-4505	f	2025-05-03 19:33:55.063934	2025-05-03 19:33:55.063934		40829937
182	Eleanor	MacGowan	\N	\N	f	2025-05-03 19:33:55.109288	2025-05-03 19:33:55.109288		40829937
183	Jonathan	Maki	NJMaki@gmail.com	(504) 982-1115	f	2025-05-03 19:33:55.153636	2025-05-03 19:33:55.153636		40829937
184	Barrett	MacGowan	blmacgowan@gmail.com	(985) 373-5463	f	2025-05-03 19:33:55.199153	2025-05-03 19:33:55.199153		40829937
185	Cecilia	Marshall	cbmarsh504@gmail.com	\N	f	2025-05-03 19:33:55.248414	2025-05-03 19:33:55.248414		40829937
186	Lili	Maki	liliwallace1991@gmail.com	(615) 293-5535	f	2025-05-03 19:33:55.29515	2025-05-03 19:33:55.29515		40829937
187	Mike	Marshall	mike@turnservices.com	(504) 218-3472	f	2025-05-03 19:33:55.341721	2025-05-03 19:33:55.341721		40829937
188	Evan	May	\N	\N	f	2025-05-03 19:33:55.386376	2025-05-03 19:33:55.386376		40829937
189	Della	Mays	mommamays@hotmail.com	(352) 339-5006	f	2025-05-03 19:33:55.43047	2025-05-03 19:33:55.43047		40829937
190	Emily	McCorkle	e.mccorkle@gmail.com	\N	f	2025-05-03 19:33:55.474541	2025-05-03 19:33:55.474541		40829937
191	Michael	McNulty	\N	\N	f	2025-05-03 19:33:55.518542	2025-05-03 19:33:55.518542		40829937
192	Catherine	McDermott	catgeo84@yahoo.com	(504) 220-4256	f	2025-05-03 19:33:55.563322	2025-05-03 19:33:55.563322		40829937
193	Eileen	McNulty	eileen.mckenna@gmail.com	(504) 616-5003	f	2025-05-03 19:33:55.60723	2025-05-03 19:33:55.60723		40829937
194	Troy	Meredith	tman84675@gmail.com	\N	f	2025-05-03 19:33:55.651227	2025-05-03 19:33:55.651227		40829937
195	Patricia	Meredith	patriciameredith219@yahoo.com	(504) 272-4088	f	2025-05-03 19:33:55.695036	2025-05-03 19:33:55.695036		40829937
196	Austin	Mohlenbrok	\N	\N	f	2025-05-03 19:33:55.74026	2025-05-03 19:33:55.74026		40829937
197	Meredith	McInturff	mcmcinturff@gmail.com	(859) 213-0217	f	2025-05-03 19:33:55.784302	2025-05-03 19:33:55.784302		40829937
198	Emily	Mohlenbrok	emilymohlenbrok@gmail.com	(205) 799-1193	f	2025-05-03 19:33:55.828281	2025-05-03 19:33:55.828281		40829937
199	Samual	Moot	samual.r.moot@gmail.com	(504) 952-7533	f	2025-05-03 19:33:55.872249	2025-05-03 19:33:55.872249		40829937
200	Liz	Fiegel	elizabethamurphy28@gmail.com	(601) 519-9382	f	2025-05-03 19:33:55.924779	2025-05-03 19:33:55.924779		40829937
201	Madeline	Moot	madelinezelenka@gmail.com	(985) 502-5687	f	2025-05-03 19:33:55.971228	2025-05-03 19:33:55.971228		40829937
202	Amy	Moran	\N	\N	f	2025-05-03 19:33:56.018161	2025-05-03 19:33:56.018161		40829937
203	Brock	Moran	\N	\N	f	2025-05-03 19:33:56.065273	2025-05-03 19:33:56.065273		40829937
204	Dan	Moran	\N	\N	f	2025-05-03 19:33:56.109916	2025-05-03 19:33:56.109916		40829937
205	Sarah	Moran	\N	\N	f	2025-05-03 19:33:56.155275	2025-05-03 19:33:56.155275		40829937
206	Anna	Newman	annahle323@gmail.com	(864) 237-4568	f	2025-05-03 19:33:56.199637	2025-05-03 19:33:56.199637		40829937
207	Michael	Newman	mnewman.au@gmail.com	(985) 710-5353	f	2025-05-03 19:33:56.243661	2025-05-03 19:33:56.243661		40829937
208	Tara	Nored	taranored06@gmail.com	(210) 452-2264	f	2025-05-03 19:33:56.287484	2025-05-03 19:33:56.287484		40829937
209	Charlotte	Ordeneaux	crordeneaux@hotmail.com	(504) 214-2972	f	2025-05-03 19:33:56.331487	2025-05-03 19:33:56.331487		40829937
210	Henry	Ordeneaux	\N	\N	f	2025-05-03 19:33:56.376562	2025-05-03 19:33:56.376562		40829937
211	Chidinma	Nwankwo	chimanmanwankwo@gmail.com	(504) 388-9156	f	2025-05-03 19:33:56.420663	2025-05-03 19:33:56.420663		40829937
212	Jimmy	Ordeneaux	jordeneaux@pmpllp.com	(504) 616-9021	f	2025-05-03 19:33:56.465255	2025-05-03 19:33:56.465255		40829937
213	April	Payne	payneaj79@gmail.com	(504) 722-8599	f	2025-05-03 19:33:56.509478	2025-05-03 19:33:56.509478		40829937
214	John	Payne	Littlepayne69@yahoo.com	(504) 722-9304	f	2025-05-03 19:33:56.553602	2025-05-03 19:33:56.553602		40829937
215	Jessica	Peterson	jessz_peterson@hotmail.com	(504) 717-1691	f	2025-05-03 19:33:56.599302	2025-05-03 19:33:56.599302		40829937
216	Jonathan	Peterson	\N	\N	f	2025-05-03 19:33:56.643348	2025-05-03 19:33:56.643348		40829937
217	Jordan	Peck	jordanpeckstl@gmail.com	\N	f	2025-05-03 19:33:56.68842	2025-05-03 19:33:56.68842		40829937
218	Audrey	Peterson	\N	\N	f	2025-05-03 19:33:56.733215	2025-05-03 19:33:56.733215		40829937
219	Rebecca	Otten	rebecca.otten@gmail.com	(262) 853-4467	f	2025-05-03 19:33:56.777235	2025-05-03 19:33:56.777235		40829937
220	Pauline	Ramos	casaderamos@me.com	(713) 828-9023	f	2025-05-03 19:33:56.821116	2025-05-03 19:33:56.821116		40829937
221	Gia	Ramos	\N	\N	f	2025-05-03 19:33:56.865089	2025-05-03 19:33:56.865089		40829937
223	David	Rizzo	davidrizzo@gmail.com	(504) 621-2048	f	2025-05-03 19:33:57.080627	2025-05-03 19:33:57.080627		40829937
224	Grace	Thacker	gracethacker@gmail.com	(504) 478-6663	f	2025-05-03 19:33:57.122701	2025-05-03 19:33:57.122701		40829937
225	Matt	Roelofs	matt.roelofs@ruf.org	(901) 438-5007	f	2025-05-03 19:33:57.163542	2025-05-03 19:33:57.163542		40829937
226	Jackie	Roelofs	jackieroelofs@gmail.com	(850) 324-5094	f	2025-05-03 19:33:57.204471	2025-05-03 19:33:57.204471		40829937
227	Brad	Sanders	bsanders@vbar.com	\N	f	2025-05-03 19:33:57.246494	2025-05-03 19:33:57.246494		40829937
228	Brent	Rose	brentrose504@gmail.com	(504) 296-3777	f	2025-05-03 19:33:57.289068	2025-05-03 19:33:57.289068		40829937
229	Monica	Rose	mrose@rhousela.org	(504) 339-6257	f	2025-05-03 19:33:57.331297	2025-05-03 19:33:57.331297		40829937
230	Jesse	Sanders	\N	\N	f	2025-05-03 19:33:57.377344	2025-05-03 19:33:57.377344		40829937
231	Shannon	Sanders	shannonwsanders@yahoo.com	(504) 577-6556	f	2025-05-03 19:33:57.418944	2025-05-03 19:33:57.418944		40829937
232	Abbey	Sanders	\N	\N	f	2025-05-03 19:33:57.460608	2025-05-03 19:33:57.460608		40829937
233	Sarah	Satterlee	satterlee.sarah@gmail.com	(985) 264-1418	f	2025-05-03 19:33:57.505607	2025-05-03 19:33:57.505607		40829937
234	Katrina	Schilling	4schillings@gmail.com	(601) 408-5819	f	2025-05-03 19:33:57.552398	2025-05-03 19:33:57.552398		40829937
235	Garin	Siekkinen	garin1147@yahoo.com	(504) 352-4929	f	2025-05-03 19:33:57.593854	2025-05-03 19:33:57.593854		40829937
236	Gloria	Siekkinen	\N	\N	f	2025-05-03 19:33:57.635985	2025-05-03 19:33:57.635985		40829937
238	Emily	Siekkinen	emilysiekkinen@gmail.com	(504) 351-4201	f	2025-05-03 19:33:57.873628	2025-05-03 19:33:57.873628		40829937
239	Simon	Siekkinen	\N	\N	f	2025-05-03 19:33:57.921597	2025-05-03 19:33:57.921597		40829937
240	Drew	Siekkinen	\N	\N	f	2025-05-03 19:33:57.968802	2025-05-03 19:33:57.968802		40829937
241	Brittany Tillery	Simon	\N	\N	f	2025-05-03 19:33:58.015508	2025-05-03 19:33:58.015508		40829937
242	Kamron Jake	Simon	\N	\N	f	2025-05-03 19:33:58.061701	2025-05-03 19:33:58.061701		40829937
243	Luke	Sirinides	lukesirinides@gmail.com	(504) 258-0497	f	2025-05-03 19:33:58.108626	2025-05-03 19:33:58.108626		40829937
244	Megan	Tallman	megan.n.lindsey@gmail.com	(337) 258-1307	f	2025-05-03 19:33:58.155402	2025-05-03 19:33:58.155402		40829937
245	Pierson	Tallman	\N	\N	f	2025-05-03 19:33:58.202641	2025-05-03 19:33:58.202641		40829937
246	Tyler	Tallman	dspiteself@gmail.com	(337) 205-2142	f	2025-05-03 19:33:58.249284	2025-05-03 19:33:58.249284		40829937
247	Tim	Traycoff	ttraycoff@gmail.com	(317) 450-3276	f	2025-05-03 19:33:58.301065	2025-05-03 19:33:58.301065		40829937
248	Dylan	Turner	dylanfield@gmail.com	(504) 858-4799	f	2025-05-03 19:33:58.348695	2025-05-03 19:33:58.348695		40829937
249	Sabra	Turner	sabra.matheny@gmail.com	(985) 351-1720	f	2025-05-03 19:33:58.396177	2025-05-03 19:33:58.396177		40829937
250	Scott	Verret	spv504@yahoo.com	(504) 382-8353	f	2025-05-03 19:33:58.447161	2025-05-03 19:33:58.447161		40829937
251	Barry	Verdon	barrybernardverdon@gmail.com	\N	f	2025-05-03 19:33:58.502882	2025-05-03 19:33:58.502882		40829937
252	Tina	Verret	tina.verret@yahoo.com	(504) 301-5738	f	2025-05-03 19:33:58.552385	2025-05-03 19:33:58.552385		40829937
253	Christopher	Wappel	cwappel@joneswalker.com	(504) 914-4233	f	2025-05-03 19:33:58.599502	2025-05-03 19:33:58.599502		40829937
254	Beth	Watkins	beth1817@bellsouth.net	(504) 430-0878	f	2025-05-03 19:33:58.648829	2025-05-03 19:33:58.648829		40829937
255	Bijou	Watkins	\N	\N	f	2025-05-03 19:33:58.695977	2025-05-03 19:33:58.695977		40829937
257	Jill	Watkins	jschliesser@aol.com	(504) 458-2160	f	2025-05-03 19:33:58.93094	2025-05-03 19:33:58.93094		40829937
258	Isabelle	Watkins	\N	\N	f	2025-05-03 19:33:58.974121	2025-05-03 19:33:58.974121		40829937
259	Joseph	Watkins	\N	\N	f	2025-05-03 19:33:59.021112	2025-05-03 19:33:59.021112		40829937
260	Joey	Watkins	joeywatkinsim@hotmail.com	(504) 458-5995	f	2025-05-03 19:33:59.064612	2025-05-03 19:33:59.064612		40829937
261	Josephine	Watkins	\N	\N	f	2025-05-03 19:33:59.116938	2025-05-03 19:33:59.116938		40829937
262	Ben	Whitworth	benjamin.whitworth@icloud.com	(904) 652-8107	f	2025-05-03 19:33:59.160899	2025-05-03 19:33:59.160899		40829937
263	Cate	Whitworth	\N	\N	f	2025-05-03 19:33:59.205776	2025-05-03 19:33:59.205776		40829937
264	Charlotte	Whitworth	\N	\N	f	2025-05-03 19:33:59.251151	2025-05-03 19:33:59.251151		40829937
265	Nel	Whitworth	\N	\N	f	2025-05-03 19:33:59.295218	2025-05-03 19:33:59.295218		40829937
266	Jessica	Whitworth	jessicagwhitworth@gmail.com	(904) 524-3567	f	2025-05-03 19:33:59.338542	2025-05-03 19:33:59.338542		40829937
267	Buck	Williams	emwilliams3@yahoo.com	(404) 290-0613	f	2025-05-03 19:33:59.381765	2025-05-03 19:33:59.381765		40829937
268	Joe	Willis	loboregal@hotmail.com	(609) 206-4411	f	2025-05-03 19:33:59.428496	2025-05-03 19:33:59.428496		40829937
269	Paula	Willis	sunrisepbj@yahoo.com	(609) 203-9576	f	2025-05-03 19:33:59.477215	2025-05-03 19:33:59.477215		40829937
270	Charlotte	Woolf	\N	\N	f	2025-05-03 19:33:59.52285	2025-05-03 19:33:59.52285		40829937
271	Vance	Woolf	vancewoolf@hotmail.com	(504) 453-6669	f	2025-05-03 19:33:59.568274	2025-05-03 19:33:59.568274		40829937
272	Cara	Woolf	caralainemccool@hotmail.com	(504) 715-0818	f	2025-05-03 19:33:59.612441	2025-05-03 19:33:59.612441		40829937
273	Will	Woolf	\N	\N	f	2025-05-03 19:33:59.656236	2025-05-03 19:33:59.656236		40829937
274	Anne Elizabeth	Zegel	aezegel@gmail.com	(601) 863-6122	f	2025-05-03 19:33:59.699592	2025-05-03 19:33:59.699592		40829937
275	Daniel	Zegel	dzegel1@gmail.com	(615) 456-2496	f	2025-05-03 19:33:59.745335	2025-05-03 19:33:59.745335		40829937
276	Corina	Zapata	caatsy@yahoo.com	\N	f	2025-05-03 19:33:59.790233	2025-05-03 19:33:59.790233		40829937
277	Audrey	Portillo Recinos	agportillorecinos@gmail.com	(626) 261-1807	f	2025-05-03 19:33:59.83369	2025-05-03 19:33:59.83369		40829937
278	Pauline S	Cook	pscook51@gmail.com	\N	f	2025-05-03 19:33:59.87719	2025-05-03 19:33:59.87719		40829937
279	Dominic	Rizzo	\N	\N	f	2025-05-03 19:33:59.921012	2025-05-03 19:33:59.921012		40829937
280	Ethan	Payne	\N	\N	f	2025-05-03 19:33:59.964583	2025-05-03 19:33:59.964583		40829937
281	Charles	Payne	\N	\N	f	2025-05-03 19:34:00.013006	2025-05-03 19:34:00.013006		40829937
282	Daryl John	Payne	xing105dj@gmail.com	\N	f	2025-05-03 19:34:00.059179	2025-05-03 19:34:00.059179		40829937
283	Cara Elizabeth “Cece”	Woolf	\N	\N	f	2025-05-03 19:34:00.102548	2025-05-03 19:34:00.102548		40829937
284	Lacy	Modica	lacyvgarrett@gmail.com	(478) 718-7909	f	2025-05-03 19:34:00.145139	2025-05-03 19:34:00.145139		40829937
285	Thomas	Downs	thomasrdowns@gmail.com	(251) 233-8501	f	2025-05-03 19:34:00.189016	2025-05-03 19:34:00.189016		40829937
286	Mary	Jones	mjones52@tulane.edu	(770) 231-0586	f	2025-05-03 19:34:00.232295	2025-05-03 19:34:00.232295		40829937
287	Tiffany	Adler	etadler@yahoo.com	(504) 583-9908	f	2025-05-03 19:34:00.27629	2025-05-03 19:34:00.27629		40829937
288	Merrick	McCool	merrickmccool@gmail.com	(662) 832-2773	f	2025-05-03 19:34:00.319673	2025-05-03 19:34:00.319673		40829937
289	Omar	Hamid	omariqbal.hamid@gmail.com	(504) 975-5310	f	2025-05-03 19:34:00.362958	2025-05-03 19:34:00.362958		40829937
290	Megan	Waterston	mwaterston09@gmail.com	(214) 725-1216	f	2025-05-03 19:34:00.408097	2025-05-03 19:34:00.408097		40829937
291	Preston	McWilliams	michaelprestonmcwilliams@gmail.com	(601) 596-3212	f	2025-05-03 19:34:00.452306	2025-05-03 19:34:00.452306		40829937
292	Laurel	Downs	laurelrdowns@gmail.com	(504) 250-6865	f	2025-05-03 19:34:00.495458	2025-05-03 19:34:00.495458		40829937
293	Ellie Sue	Downs	\N	\N	f	2025-05-03 19:34:00.538961	2025-05-03 19:34:00.538961		40829937
294	Jetta Mae	Downs	\N	\N	f	2025-05-03 19:34:00.58232	2025-05-03 19:34:00.58232		40829937
295	Katherine	Sharp	sharpsustainability@gmail.com	\N	f	2025-05-03 19:34:00.627989	2025-05-03 19:34:00.627989		40829937
296	Vince	D	Vjdthird@yahoo.com	(504) 315-8665	f	2025-05-03 19:34:00.671368	2025-05-03 19:34:00.671368		40829937
297	Mya	Jackson	mya.jackson9149@yahoo.com	(251) 406-0015	f	2025-05-03 19:34:00.714608	2025-05-03 19:34:00.714608		40829937
298	Phillip	Gray	bushwickphill@icloud.com	\N	f	2025-05-03 19:34:00.75838	2025-05-03 19:34:00.75838		40829937
299	Ella	Maki	\N	\N	f	2025-05-03 19:34:00.801872	2025-05-03 19:34:00.801872		40829937
300	Nellie Gray	Maki	\N	\N	f	2025-05-03 19:34:00.845198	2025-05-03 19:34:00.845198		40829937
301	Peter	Davis	\N	\N	f	2025-05-03 19:34:00.889186	2025-05-03 19:34:00.889186		40829937
302	Cora	Kessler	\N	\N	f	2025-05-03 19:34:00.932881	2025-05-03 19:34:00.932881		40829937
303	Aaron	Kessler	\N	\N	f	2025-05-03 19:34:00.976291	2025-05-03 19:34:00.976291		40829937
304	Pauline	Ordeneaux	\N	\N	f	2025-05-03 19:34:01.020331	2025-05-03 19:34:01.020331		40829937
305	Charlotte	Ordeneaux	\N	\N	f	2025-05-03 19:34:01.064007	2025-05-03 19:34:01.064007		40829937
306	Martha Miller	Ordeneaux	\N	\N	f	2025-05-03 19:34:01.107104	2025-05-03 19:34:01.107104		40829937
307	Reed	Roelofs	\N	\N	f	2025-05-03 19:34:01.150439	2025-05-03 19:34:01.150439		40829937
308	Blair	Fiegel	\N	\N	f	2025-05-03 19:34:01.193563	2025-05-03 19:34:01.193563		40829937
309	David	Fiegel	\N	\N	f	2025-05-03 19:34:01.236858	2025-05-03 19:34:01.236858		40829937
310	Hannah	Schmucker	hsschmucker@gmail.com	(610) 551-0786	f	2025-05-03 19:34:01.280616	2025-05-03 19:34:01.280616		40829937
311	Marybeth	McBain	mcbain.marybeth@gmail.com	(281) 928-9512	f	2025-05-03 19:34:01.323619	2025-05-03 19:34:01.323619		40829937
312	Chase	Hunsicker	chasehunsicker@gmail.com	(678) 551-1896	f	2025-05-03 19:34:01.366984	2025-05-03 19:34:01.366984		40829937
313	Brandon	Rojas	\N	\N	f	2025-05-03 19:34:01.409213	2025-05-03 19:34:01.409213		40829937
314	Melanie	Word	melanie.word@ruf.org	(662) 379-3363	f	2025-05-03 19:34:01.453408	2025-05-03 19:34:01.453408		40829937
315	Charlotte	Curtis	\N	\N	f	2025-05-03 19:34:01.497034	2025-05-03 19:34:01.497034		40829937
316	Bodynk	M	michael.saklc@hotmail.com	\N	f	2025-05-03 19:34:01.540216	2025-05-03 19:34:01.540216		40829937
317	Sara Caitlin	Ritsch	saracritsch@gmail.com	\N	f	2025-05-03 19:34:01.583304	2025-05-03 19:34:01.583304		40829937
318	Leighton	McCool	leightonwmccool@gmail.com	(662) 832-2771	f	2025-05-03 19:34:01.62654	2025-05-03 19:34:01.62654		40829937
319	James	Wakeland	jmw930@gmail.com	(832) 566-4362	f	2025-05-03 19:34:01.669604	2025-05-03 19:34:01.669604		40829937
320	Erika	Brent	erika.brent12@gmail.com	(504) 439-1410	f	2025-05-03 19:34:01.712986	2025-05-03 19:34:01.712986		40829937
321	Rob	Brent	\N	\N	f	2025-05-03 19:34:01.756649	2025-05-03 19:34:01.756649		40829937
322	Ryan	Brent	\N	\N	f	2025-05-03 19:34:01.801559	2025-05-03 19:34:01.801559		40829937
323	Mary	Brent	\N	\N	f	2025-05-03 19:34:01.844416	2025-05-03 19:34:01.844416		40829937
324	Karey	Coleman	kandpcoleman@comcast.net	(615) 406-6655	f	2025-05-03 19:34:01.889751	2025-05-03 19:34:01.889751		40829937
325	Sarah	Schmidt	skpschmidt@gmail.com	(352) 470-6294	f	2025-05-03 19:34:01.934215	2025-05-03 19:34:01.934215		40829937
326	Alexander	Schmidt	\N	\N	f	2025-05-03 19:34:01.983279	2025-05-03 19:34:01.983279		40829937
327	Gil	Schmidt	gilschmidt89@gmail.com	(205) 535-2267	f	2025-05-03 19:34:02.029292	2025-05-03 19:34:02.029292		40829937
328	Lise	Coetzee	lcoetzee@tulane.edu	(504) 877-1359	f	2025-05-03 19:34:02.075404	2025-05-03 19:34:02.075404		40829937
329	Kepha	Mwangi	kephamwangi@gmail.com	\N	f	2025-05-03 19:34:02.12127	2025-05-03 19:34:02.12127		40829937
330	Elsie	Elliot	\N	\N	f	2025-05-03 19:34:02.164606	2025-05-03 19:34:02.164606		40829937
331	River	Roelofs	\N	\N	f	2025-05-03 19:34:02.20766	2025-05-03 19:34:02.20766		40829937
332	Shepherd	Longmire	\N	\N	f	2025-05-03 19:34:02.253349	2025-05-03 19:34:02.253349		40829937
333	Jonathan	Somma	jondsomma@gmail.com	(914) 793-3599	f	2025-05-03 19:34:02.296741	2025-05-03 19:34:02.296741		40829937
334	Nicole	Somma	nssomma@gmail.com	\N	f	2025-05-03 19:34:02.340947	2025-05-03 19:34:02.340947		40829937
335	James	Monayo	james.monayo@trinitasinternationalschool.sc.ke	\N	f	2025-05-03 19:34:02.385217	2025-05-03 19:34:02.385217		40829937
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
QLKQDxoMFWrRmm57BkqUQI2oVxlJxmwr	{"cookie": {"path": "/", "secure": true, "expires": "2025-05-15T17:30:39.503Z", "httpOnly": true, "originalMaxAge": 604800000}, "passport": {"user": {"claims": {"sub": "40829937", "email": "jspivey@spiveyco.com", "username": "jspivey@spiveyco.com"}}}}	2025-05-15 17:36:27
Vixe-NzCbfnHkIfy9H8n83xXdqNmR9Fk	{"cookie": {"path": "/", "secure": true, "expires": "2025-05-13T17:14:19.047Z", "httpOnly": true, "originalMaxAge": 604800000}, "passport": {"user": {"claims": {"sub": "644128517", "email": "jmspivey@icloud.com", "username": "jmspivey@icloud.com"}}}}	2025-05-13 18:52:53
dD7X5Fo2Kp0bwOaA3imAZkK2f0fOkRkB	{"cookie": {"path": "/", "secure": true, "expires": "2025-05-13T18:39:07.554Z", "httpOnly": true, "originalMaxAge": 604800000}, "passport": {"user": {"claims": {"aud": "2ff4ba9d-bd8c-4ea0-83d3-33bd83ea2669", "bio": null, "exp": 1746560347, "iat": 1746556747, "iss": "https://replit.com/oidc", "sub": "40829937", "email": "jspivey@spiveyco.com", "at_hash": "8PshwISH1fJKGOdqtJgF_g", "username": "jspivey", "auth_time": 1746543481, "last_name": "Spivey", "first_name": "John"}, "expires_at": 1746560347, "access_token": "i_ePTLKQMtbF-DWJ2EjVBsYmTDVVkPTIV2wC5QFpC6a", "refresh_token": "TNqNJht6WcDINWPpjWzr2YZDjQ1q5JuH2NGhtgqxiQn"}}}	2025-05-13 18:53:06
mfqwb33Rb5JRlUmW35MO4b4C_NQKYZjt	{"cookie": {"path": "/", "secure": true, "expires": "2025-05-14T13:27:58.819Z", "httpOnly": true, "originalMaxAge": 604800000}, "passport": {"user": {"claims": {"sub": "40829937", "email": "jspivey@spiveyco.com", "username": "jspivey@spiveyco.com"}}}}	2025-05-15 16:41:12
sLyqLyeH5RG7xqmlO_mjhiBvahb3eWnZ	{"cookie": {"path": "/", "secure": true, "expires": "2025-05-13T14:57:42.189Z", "httpOnly": true, "originalMaxAge": 604800000}, "replit.com": {"code_verifier": "0vOWcrq8mDFWw7SJHUqTwU1W8S2DdW1dAatv6SfcEtg"}}	2025-05-13 21:03:28
7N9pskAxU63jcrWru8mJ4AwPH0awvxdw	{"cookie": {"path": "/", "secure": true, "expires": "2025-05-13T16:12:18.118Z", "httpOnly": true, "originalMaxAge": 604799999}, "passport": {"user": {"claims": {"aud": "2ff4ba9d-bd8c-4ea0-83d3-33bd83ea2669", "bio": null, "exp": 1746551537, "iat": 1746547937, "iss": "https://replit.com/oidc", "sub": "40829937", "email": "jspivey@spiveyco.com", "at_hash": "GWa9zKIaSaFF9kHTypAamA", "username": "jspivey", "auth_time": 1746481069, "last_name": "Spivey", "first_name": "John"}, "expires_at": 1746551537, "access_token": "ziR9pzxcUqf1Y5BjIKNLeSWCLo-xC16zVsvEudffgXD", "refresh_token": "PFgqFjBhWU1vxgbUJFebOlKneb7aPcEbNw6HkseC7bQ"}}}	2025-05-13 16:12:21
Mxg1aeHM7CQSElQYSsyujD9z9hqgWvGV	{"cookie": {"path": "/", "secure": true, "expires": "2025-05-13T17:12:44.595Z", "httpOnly": true, "originalMaxAge": 604800000}, "passport": {"user": {"claims": {"aud": "2ff4ba9d-bd8c-4ea0-83d3-33bd83ea2669", "bio": null, "exp": 1746555164, "iat": 1746551564, "iss": "https://replit.com/oidc", "sub": "40829937", "email": "jspivey@spiveyco.com", "at_hash": "f9rK8QB1ebRewBAbaXopKw", "username": "jspivey", "auth_time": 1746399673, "last_name": "Spivey", "first_name": "John"}, "expires_at": 1746555164, "access_token": "OF2P1QFEVqocbL6hoW8cI1zEtXb7or2Um7CxNDRUioa", "refresh_token": "ONdQdDabgbbrFOiXfvsHcCqm374nV7bBkUJRTJ4INSn"}}}	2025-05-13 17:12:57
IeNSeMJ48tXx_CHk9Fs8xPlXN0wPMUMw	{"cookie": {"path": "/", "secure": true, "expires": "2025-05-10T16:12:46.289Z", "httpOnly": true, "originalMaxAge": 604800000}, "passport": {"user": {"claims": {"aud": "2ff4ba9d-bd8c-4ea0-83d3-33bd83ea2669", "bio": null, "exp": 1746292365, "iat": 1746288765, "iss": "https://replit.com/oidc", "sub": "40829937", "email": "jspivey@spiveyco.com", "at_hash": "TrOYmfUAx75SFdGbGR7Dng", "username": "jspivey", "auth_time": 1746288765, "last_name": "Spivey", "first_name": "John"}, "expires_at": 1746292365, "access_token": "aET8o8Co8Axr-3WrKLGvRYWyxymaZOpN_GZEYpPMi10", "refresh_token": "fKdMlvnNnlNWoA64TukwxVZNf8X5X3-tyrcs4w82fJg"}}}	2025-05-10 16:35:34
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

SELECT pg_catalog.setval('public.batches_id_seq', 107, true);


--
-- Name: donations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.donations_id_seq', 179, true);


--
-- Name: email_templates_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.email_templates_id_seq', 8, true);


--
-- Name: members_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.members_id_seq', 335, true);


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

