
DROP TABLE IF EXISTS aaaa_pettine.nodi;
CREATE TABLE aaaa_pettine.nodi
(
    "idNodo" bigint PRIMARY KEY,
    "codNodo" character varying UNIQUE,
    "denominazione" character varying ,
    "tipoNodo" character varying ,
    "codIstatComune" character varying ,
    "denominazioneComune" character varying ,
    "codIstatProvincia" character varying ,
    "siglaProvincia" character varying ,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    lat double precision,
    lng double precision
    -- ,geom geometry(POINT, 4326)
);




DROP TABLE IF EXISTS aaaa_pettine.fermate;
CREATE TABLE aaaa_pettine.fermate
(
    "idFermata" bigint PRIMARY KEY,
    "codFermata" bigint  UNIQUE,
    "desc" character varying ,
    "codNodo" character varying ,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    lat double precision,
    lng double precision
    -- ,geom geometry(POINT, 4326)
);



DROP TABLE IF EXISTS aaaa_pettine.paline;
CREATE TABLE aaaa_pettine.paline
(
    "idPalina" bigint PRIMARY KEY,
    "desc" character varying ,
    azienda character varying ,
    "codCsrAzienda" smallint,
    "codFermata" bigint,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    lat double precision,
    lng double precision
    -- ,geom geometry(POINT, 4326)
);


-- https://x-team.com/blog/automatic-timestamps-with-postgresql/
CREATE OR REPLACE FUNCTION aaaa_pettine.trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


CREATE TRIGGER set_timestamp
BEFORE UPDATE ON aaaa_pettine.nodi
FOR EACH ROW
EXECUTE PROCEDURE aaaa_pettine.trigger_set_timestamp();


CREATE TRIGGER set_timestamp
BEFORE UPDATE ON aaaa_pettine.fermate
FOR EACH ROW
EXECUTE PROCEDURE aaaa_pettine.trigger_set_timestamp();


CREATE TRIGGER set_timestamp
BEFORE UPDATE ON aaaa_pettine.paline
FOR EACH ROW
EXECUTE PROCEDURE aaaa_pettine.trigger_set_timestamp();