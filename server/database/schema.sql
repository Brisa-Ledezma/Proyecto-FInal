-- Golden Screen · Esquema de base de datos (MySQL 8)
-- Sigue el modelo de dominio de la Figura 2 de la documentación.
-- Los triggers de auditoría (RNF-16) se crean desde setup.js.

SET NAMES utf8mb4;

CREATE TABLE usuario (
  id_usuario          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre              VARCHAR(60)  NOT NULL,
  apellido            VARCHAR(60)  NOT NULL,
  email               VARCHAR(120) NOT NULL,
  fecha_nacimiento    DATE         NULL,
  hash_contrasena     CHAR(60)     NOT NULL,                       -- bcrypt (RNF-02)
  rol                 ENUM('ESPECTADOR','ENCARGADO_SALA','ADMINISTRADOR') NOT NULL DEFAULT 'ESPECTADOR',
  correo_verificado   TINYINT(1)   NOT NULL DEFAULT 0,              -- RN-16
  activo              TINYINT(1)   NOT NULL DEFAULT 1,              -- RF-17
  token_verificacion  CHAR(64)     NULL,
  acepto_privacidad_en DATETIME    NULL,                            -- RNF-14
  ultima_actividad    DATETIME     NULL,                            -- RN-02, RNF-04
  creado_en           DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_usuario_email (email),
  UNIQUE KEY uq_usuario_token (token_verificacion)
) ENGINE=InnoDB;

CREATE TABLE pelicula (
  id_pelicula   INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  titulo        VARCHAR(150) NOT NULL,
  sinopsis      TEXT         NOT NULL,
  genero        VARCHAR(40)  NOT NULL,
  clasificacion ENUM('ATP','+13','+16','+18') NOT NULL,
  duracion_min  SMALLINT UNSIGNED NOT NULL,
  afiche        VARCHAR(255) NULL,
  activa        TINYINT(1)   NOT NULL DEFAULT 1,
  creada_en     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT ck_pelicula_duracion CHECK (duracion_min > 0)           -- RN-10
) ENGINE=InnoDB;

CREATE TABLE sala (
  id_sala  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre   VARCHAR(40) NOT NULL,
  UNIQUE KEY uq_sala_nombre (nombre)
) ENGINE=InnoDB;

-- Composición Sala - Fila - Butaca (RF-12, RN-11)
CREATE TABLE fila (
  id_fila  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_sala  INT UNSIGNED NOT NULL,
  letra    CHAR(1)      NOT NULL,
  orden    TINYINT UNSIGNED NOT NULL,
  UNIQUE KEY uq_fila_sala_letra (id_sala, letra),
  CONSTRAINT fk_fila_sala FOREIGN KEY (id_sala) REFERENCES sala (id_sala) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE butaca (
  id_butaca  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_fila    INT UNSIGNED NOT NULL,
  numero     TINYINT UNSIGNED NOT NULL,
  habilitada TINYINT(1) NOT NULL DEFAULT 1,
  UNIQUE KEY uq_butaca_fila_numero (id_fila, numero),
  CONSTRAINT fk_butaca_fila FOREIGN KEY (id_fila) REFERENCES fila (id_fila) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE funcion (
  id_funcion        INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_pelicula       INT UNSIGNED NOT NULL,
  id_sala           INT UNSIGNED NOT NULL,
  fecha_hora_inicio DATETIME     NOT NULL,
  fecha_hora_fin    DATETIME     NOT NULL,                          -- RN-12: inicio + duración + 15 min
  precio            DECIMAL(10,2) NOT NULL,
  estado            ENUM('PROGRAMADA','CANCELADA','FINALIZADA') NOT NULL DEFAULT 'PROGRAMADA',
  creada_en         DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY ix_funcion_sala_inicio (id_sala, fecha_hora_inicio),
  KEY ix_funcion_inicio (fecha_hora_inicio),
  CONSTRAINT ck_funcion_precio CHECK (precio > 0),
  CONSTRAINT ck_funcion_horario CHECK (fecha_hora_fin > fecha_hora_inicio),
  CONSTRAINT fk_funcion_pelicula FOREIGN KEY (id_pelicula) REFERENCES pelicula (id_pelicula),
  CONSTRAINT fk_funcion_sala FOREIGN KEY (id_sala) REFERENCES sala (id_sala)
) ENGINE=InnoDB;

CREATE TABLE reserva (
  id_reserva           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_usuario           INT UNSIGNED NOT NULL,
  id_funcion           INT UNSIGNED NOT NULL,
  fecha_hora_creacion  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  estado               ENUM('PENDIENTE_PAGO','CONFIRMADA','CANCELADA','ANULADA') NOT NULL DEFAULT 'PENDIENTE_PAGO',
  total                DECIMAL(10,2) NOT NULL,                      -- RN-05
  vence_pago           DATETIME     NULL,                           -- RN-02: temporizador de pago de 5 minutos
  fecha_hora_cierre    DATETIME     NULL,                           -- confirmación, cancelación o anulación
  KEY ix_reserva_usuario (id_usuario, estado),
  KEY ix_reserva_funcion (id_funcion, estado),
  CONSTRAINT fk_reserva_usuario FOREIGN KEY (id_usuario) REFERENCES usuario (id_usuario),
  CONSTRAINT fk_reserva_funcion FOREIGN KEY (id_funcion) REFERENCES funcion (id_funcion)
) ENGINE=InnoDB;

-- Butacas que bloquea cada reserva (1 a 6, RN-01).
-- "bloqueo" vale 1 mientras la reserva está activa y NULL cuando se cancela o anula.
-- La clave única sobre (función, butaca, bloqueo) impide que dos reservas activas
-- tomen la misma butaca (RN-03, RNF-10): los NULL no chocan entre sí.
CREATE TABLE reserva_butaca (
  id_reserva  INT UNSIGNED NOT NULL,
  id_funcion  INT UNSIGNED NOT NULL,
  id_butaca   INT UNSIGNED NOT NULL,
  bloqueo     TINYINT(1)   NULL DEFAULT 1,
  PRIMARY KEY (id_reserva, id_butaca),
  UNIQUE KEY uq_butaca_activa (id_funcion, id_butaca, bloqueo),
  CONSTRAINT fk_rb_reserva FOREIGN KEY (id_reserva) REFERENCES reserva (id_reserva),
  CONSTRAINT fk_rb_funcion FOREIGN KEY (id_funcion) REFERENCES funcion (id_funcion),
  CONSTRAINT fk_rb_butaca FOREIGN KEY (id_butaca) REFERENCES butaca (id_butaca)
) ENGINE=InnoDB;

-- Sin datos de tarjeta: solo medio, monto, estado e identificador (RNF-05)
CREATE TABLE pago (
  id_pago         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_reserva      INT UNSIGNED NOT NULL,
  medio           ENUM('TARJETA','MERCADO_PAGO') NOT NULL,
  monto           DECIMAL(10,2) NOT NULL,
  fecha_hora      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  estado          ENUM('APROBADO','RECHAZADO') NOT NULL,
  id_transaccion  VARCHAR(40)  NOT NULL,
  motivo_rechazo  VARCHAR(120) NULL,
  UNIQUE KEY uq_pago_transaccion (id_transaccion),
  KEY ix_pago_reserva (id_reserva),
  CONSTRAINT fk_pago_reserva FOREIGN KEY (id_reserva) REFERENCES reserva (id_reserva)
) ENGINE=InnoDB;

-- Registro de ingreso de dinero: uno por pago aprobado (RN-07), inmutable (RNF-16)
CREATE TABLE ingreso (
  id_ingreso  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_pago     INT UNSIGNED NOT NULL,
  id_funcion  INT UNSIGNED NOT NULL,
  id_usuario  INT UNSIGNED NOT NULL,
  monto       DECIMAL(10,2) NOT NULL,
  fecha_hora  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_ingreso_pago (id_pago),
  KEY ix_ingreso_fecha (fecha_hora),
  KEY ix_ingreso_funcion (id_funcion),
  CONSTRAINT fk_ingreso_pago FOREIGN KEY (id_pago) REFERENCES pago (id_pago),
  CONSTRAINT fk_ingreso_funcion FOREIGN KEY (id_funcion) REFERENCES funcion (id_funcion),
  CONSTRAINT fk_ingreso_usuario FOREIGN KEY (id_usuario) REFERENCES usuario (id_usuario)
) ENGINE=InnoDB;

-- Una entrada por butaca abonada, con código QR único (RN-08)
CREATE TABLE entrada (
  id_entrada          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_reserva          INT UNSIGNED NOT NULL,
  id_funcion          INT UNSIGNED NOT NULL,
  id_butaca           INT UNSIGNED NOT NULL,
  codigo_qr           CHAR(12)     NOT NULL,
  estado              ENUM('VALIDA','UTILIZADA','ANULADA') NOT NULL DEFAULT 'VALIDA',
  fecha_hora_ingreso  DATETIME     NULL,                            -- RN-09, RNF-16
  id_usuario_valida   INT UNSIGNED NULL,
  UNIQUE KEY uq_entrada_codigo (codigo_qr),
  KEY ix_entrada_funcion (id_funcion, estado),
  CONSTRAINT fk_entrada_reserva FOREIGN KEY (id_reserva) REFERENCES reserva (id_reserva),
  CONSTRAINT fk_entrada_funcion FOREIGN KEY (id_funcion) REFERENCES funcion (id_funcion),
  CONSTRAINT fk_entrada_butaca FOREIGN KEY (id_butaca) REFERENCES butaca (id_butaca),
  CONSTRAINT fk_entrada_valida FOREIGN KEY (id_usuario_valida) REFERENCES usuario (id_usuario)
) ENGINE=InnoDB;

-- Registro de correos enviados (confirmación de cuenta y avisos de cancelación)
CREATE TABLE correo_enviado (
  id_correo   INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  destinatario VARCHAR(120) NOT NULL,
  asunto      VARCHAR(160) NOT NULL,
  tipo        ENUM('CONFIRMACION_CUENTA','FUNCION_CANCELADA') NOT NULL,
  enviado_en  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  vista_previa VARCHAR(255) NULL
) ENGINE=InnoDB;

-- Archivos subidos (afiches). Se guardan en la base y no en el disco porque el
-- disco de los servidores en la nube se borra en cada despliegue o reinicio.
-- Las mismas columnas se crean en bases existentes desde database/preparar.js.
CREATE TABLE archivo (
  nombre     VARCHAR(80)  NOT NULL PRIMARY KEY,
  tipo_mime  VARCHAR(40)  NOT NULL,
  datos      MEDIUMBLOB   NOT NULL,
  creado_en  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;
