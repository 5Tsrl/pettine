
DROP TABLE public.nodi;
CREATE TABLE public.nodi
(
    "codNodo" character varying COLLATE pg_catalog."default" NOT NULL,
    denominazione character varying COLLATE pg_catalog."default",
    "tipoNodo" character varying COLLATE pg_catalog."default",
    "codIstatComune" character varying COLLATE pg_catalog."default",
    "denominazioneComune" character varying COLLATE pg_catalog."default",
    "codIstatProvincia" character varying COLLATE pg_catalog."default",
    "siglaProvincia" character varying COLLATE pg_catalog."default",
    lat numeric(7,5),
    lng numeric(7,5),
    geom geometry(POINT, 4326),
    -- geog geography(point,4326),
    CONSTRAINT nodi_pkey PRIMARY KEY ("codNodo")
);




DROP TABLE public.fermate;
CREATE TABLE public.fermate
(
    "codFermata" bigint NOT NULL,
    "desc" character varying COLLATE pg_catalog."default",
    "codNodo" character varying COLLATE pg_catalog."default",
    lat numeric(7,5),
    lng numeric(7,5),
    geom geometry(POINT, 4326),
    -- geog geography(point,4326),
    CONSTRAINT fermate_pkey PRIMARY KEY ("codFermata")
);



DROP TABLE public.paline;
CREATE TABLE public.paline
(
    "idPalina" bigint NOT NULL,
    "desc" character varying COLLATE pg_catalog."default",
    azienda character varying COLLATE pg_catalog."default",
    "codCsrAzienda" smallint,
    "codFermata" bigint,
    lat numeric(7,5),
    lng numeric(7,5),
    geom geometry(POINT, 4326),
    -- geog geography(point,4326),
    CONSTRAINT paline_pkey PRIMARY KEY ("idPalina")
);