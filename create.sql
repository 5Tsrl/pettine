
DROP TABLE public.nodi;
CREATE TABLE public.nodi
(
    "idNodo" bigint PRIMARY KEY,
    "codNodo" character varying COLLATE pg_catalog."default" NOT NULL,
    "denominazione" character varying COLLATE pg_catalog."default",
    "tipoNodo" character varying COLLATE pg_catalog."default",
    "codIstatComune" character varying COLLATE pg_catalog."default",
    "denominazioneComune" character varying COLLATE pg_catalog."default",
    "codIstatProvincia" character varying COLLATE pg_catalog."default",
    "siglaProvincia" character varying COLLATE pg_catalog."default",
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    lat numeric(7,5),
    lng numeric(7,5),
    geom geometry(POINT, 4326),
    -- geog geography(point,4326),
    CONSTRAINT nodi_pkey PRIMARY KEY ("idNodo")
);




DROP TABLE public.fermate;
CREATE TABLE public.fermate
(   
    "idFermata" bigint PRIMARY KEY,
    "codFermata" bigint NOT NULL,
    "desc" character varying COLLATE pg_catalog."default",
    "codNodo" character varying COLLATE pg_catalog."default",
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    lat numeric(7,5),
    lng numeric(7,5),
    geom geometry(POINT, 4326),
    -- geog geography(point,4326),
    CONSTRAINT fermate_pkey PRIMARY KEY ("idFermata")
);



DROP TABLE public.paline;
CREATE TABLE public.paline
(
    "idPalina" bigint PRIMARY KEY,
    "desc" character varying COLLATE pg_catalog."default",
    azienda character varying COLLATE pg_catalog."default",
    "codCsrAzienda" smallint,
    "codFermata" bigint,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    lat numeric(7,5),
    lng numeric(7,5),
    geom geometry(POINT, 4326),
    -- geog geography(point,4326),
    CONSTRAINT paline_pkey PRIMARY KEY ("idPalina")
);


-- https://x-team.com/blog/automatic-timestamps-with-postgresql/
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


CREATE TRIGGER set_timestamp
BEFORE UPDATE ON nodi
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();


CREATE TRIGGER set_timestamp
BEFORE UPDATE ON fermate
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();


CREATE TRIGGER set_timestamp
BEFORE UPDATE ON paline
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();