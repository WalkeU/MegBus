# MegBus backend

Node.js/TypeScript/Express/Socket.IO szerver a "Buszozás" játékhoz. Lásd a fő
[README](../MegBus/README.md)-t a teljes játékszabályokért és architektúráért.

## Fejlesztés

```
npm install
npm run dev     # tsx watch, http://localhost:3000
npm test        # unit + integrációs tesztek
npm run build   # production build (dist/)
```

`npm run dev` a `tsx watch`-ot használja — ez figyeli a `.ts` fájlok változását és
automatikusan újraindítja a szervert, ugyanazt tudja, mint a nodemon, csak natívan
érti a TypeScript-et, nem kell mellé külön `ts-node`/`nodemon` páros.

### Fejlesztés Docker-ben (opcionális)

Ha konténerben szeretnéd futtatni fejlesztés közben (pl. hogy izolált Node-verziót
használj, vagy mert a hoszton nincs telepítve Node), van egy külön dev compose-fájl,
ami **nem** a production `Dockerfile`/`docker-compose.yml`-t használja (abban build
lépés van és nincs élő fájlfigyelés), hanem bind mountolja a forráskódot:

```
docker compose -f docker-compose.dev.yml up --build
```

Ez a `Dockerfile.dev`-et építi fel (csak a függőségeket telepíti, buildet nem futtat),
a `./src` mappát élőben bekötve a konténerbe — így a gépeden szerkesztett `.ts`
fájlok azonnal újraindítják a `tsx watch`-ot a konténerben. Alapértelmezetten a
`3001`-es host-porton érhető el (`http://localhost:3001`), hogy ne ütközzön egy
esetlegesen már 3000-en futó másik szolgáltatással — ez a `DEV_PORT` env
változóval felülírható:

```
DEV_PORT=3000 docker compose -f docker-compose.dev.yml up --build
```

## Production: konténerizált deploy domainnel

Ez a szakasz azt írja le, hogyan viszed élesbe a backendet egy saját szerveren, Docker
konténerben, a saját domainedhez kötve, automatikus HTTPS-szel.

### Áttekintés

```
Internet ──HTTPS──▶ Caddy (443/80) ──HTTP──▶ backend konténer (3000, csak belső hálózat)
                     │
                     └─ automatikus Let's Encrypt TLS a DOMAIN-hez
```

A backend konténer **nincs közvetlenül kitéve** a netre — csak a Caddy reverse proxy,
ami TLS-t old fel és HTTP-n továbbítja a kérést a backendnek a docker-compose belső
hálózatán keresztül. Ez válaszol arra is, hogy "hogyan rakom rá az IP-t": nem az IP-vel
kell foglalkoznod, hanem a domain DNS A-rekordját kell a szerver IP-jére mutatnod —
utána a Caddy mindent elintéz (tanúsítvány kérése/megújítása, HTTP→HTTPS átirányítás).

### Előfeltételek a szerveren

- Docker + Docker Compose plugin telepítve (`docker compose version` működik).
- A domained DNS A-rekordja a szerver publikus IP-jére mutat.
- A 80-as és 443-as port nyitva/elérhető a szerveren (tűzfal, felhő biztonsági csoport).

### Lépések

1. **Kód a szerverre.** Klónozd vagy húzd le a repót a szerveren:
   ```
   git clone <a repód URL-je> megbus
   cd megbus/backend
   # később, frissítéskor: git pull
   ```

2. **`.env` létrehozása.** Ez a fájl **soha nem kerül git-be** (lásd `.gitignore`) —
   csak a szerveren, helyben hozod létre:
   ```
   cp .env.example .env
   ```
   Majd szerkeszd:
   - `DOMAIN` → a valódi domained (pl. `megbus.example.com`)
   - `CORS_ORIGIN` → állítsd `https://DOMAIN`-re (a `*` csak fejlesztéshez ajánlott)
   - `PORT` maradhat `3000` (belső, a docker-compose kezeli)

3. **Build + indítás:**
   ```
   docker compose up -d --build
   ```
   Ez felépíti a backend image-et (`Dockerfile`, multi-stage: build → production futtatás,
   nem-root felhasználóval, beépített healthcheck-kel), és elindítja mellé a Caddy
   reverse proxyt, ami automatikusan lekéri a TLS-tanúsítványt a `DOMAIN`-re.

4. **Ellenőrzés:**
   ```
   docker compose ps                       # mindkét szolgáltatás "healthy"/"running"
   curl https://DOMAIN/health              # {"status":"ok"}
   ```

5. **Frissítés később:**
   ```
   git pull
   docker compose up -d --build
   ```

### Napló / hibakeresés

```
docker compose logs -f backend
docker compose logs -f caddy
```

### Saját reverse proxy mögé (ha már fut más proxy a 80/443-on)

Ha a szerveren már van egy másik webszerver/proxy (nginx, egy másik Caddy-
instance, Nginx Proxy Manager stb.), ami foglalja a 80/443-as portot más
oldalakhoz, a fenti beépített `caddy` service-t **nem indítod el** — csak a
backendet. Fontos: a Socket.IO WebSocket-re vált, tehát a proxy-konfignak
támogatnia (és tovább kell engednie) az `Upgrade`/`Connection` fejléceket
(Nginx Proxy Managerben ez a "Websockets Support" kapcsoló).

#### Nginx Proxy Manager (NPM) esetén

Az NPM egy **saját Docker konténerben** fut, ezért a backend konténer
`127.0.0.1:3000`-es host-porton publikált címét **nem éri el közvetlenül**
(más a hálózati névtere, mint a hoszt gépnek). A megoldás: közös Docker
hálózatra tesszük a két konténert, hogy NPM a backendet a konténer NEVÉN
érhesse el, IP/port helyett. Ehhez van egy külön override fájl
(`docker-compose.npm.yml`), ami ezt hozzáadja anélkül, hogy a többi
telepítési módot (alap Caddy, sima nginx) érintené:

1. **Nézd meg, milyen Docker hálózaton fut az NPM konténered:**
   ```
   docker network ls
   ```
   Jellemzően `nginxproxymanager_default` vagy `<mappanév>_default` néven
   fut, attól függően, hogyan telepítetted. Ha nem egyértelmű, nézd meg így:
   ```
   docker inspect <npm-konténer-neve> --format '{{json .NetworkSettings.Networks}}'
   ```

2. **Indítsd a backendet erre a hálózatra kötve:**
   ```
   NPM_NETWORK_NAME=nginxproxymanager_default docker compose -f docker-compose.yml -f docker-compose.npm.yml up -d --build backend
   ```
   (a `nginxproxymanager_default`-et cseréld a saját hálózatod nevére).

3. **Az NPM admin felületén** hozz létre egy új Proxy Host-ot:
   - **Domain Names**: `megbus.walkegabor.hu`
   - **Scheme**: `http`
   - **Forward Hostname / IP**: `megbus-backend` (ez a backend konténer neve —
     mivel közös hálózaton vannak, NPM a Docker DNS-en keresztül feloldja)
   - **Forward Port**: `3000`
   - **Websockets Support**: **bekapcsolva** — enélkül a Socket.IO nem fog
     működni, csak a sima HTTP `/health` végpont
   - **SSL** fülön: kérj Let's Encrypt tanúsítványt, "Force SSL" bekapcsolva

4. **Ellenőrzés:**
   ```
   curl https://megbus.walkegabor.hu/health   # {"status":"ok"}
   ```

#### Sima nginx (nem NPM, hanem közvetlen konfigfájl)

Ha a meglévő proxy egyszerű, konfigfájlból kezelt nginx (nem NPM), akkor a
`127.0.0.1:3000` közvetlenül elérhető neki (ugyanazon a hoszton fut, nincs
Docker-hálózati elszigetelés), csak indítsd `docker compose up -d --build backend`-del,
és add hozzá ezt a szerver-blokkot:
```nginx
server {
    listen 443 ssl http2;
    server_name megbus.walkegabor.hu;

    # a saját, már meglévő TLS-tanúsítvány-kezelésed (certbot stb.) idekerül

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
    }
}
```

**Caddy** (ha a meglévő proxy is Caddy — egyszerűbb, a WebSocket-upgrade-et
automatikusan kezeli, nem kell külön beállítani), tedd hozzá a saját
Caddyfile-odhoz:
```
megbus.walkegabor.hu {
    reverse_proxy 127.0.0.1:3000
}
```

Utána reload-old a saját proxydat (pl. `nginx -s reload` vagy
`systemctl reload caddy`, attól függően, mi fut), és állítsd be a DNS
A-rekordot: `megbus.walkegabor.hu` → a szerver publikus IP-je.

Ellenőrzés:
```
curl https://megbus.walkegabor.hu/health   # {"status":"ok"}
```

### Az iOS app bekötése éles szerverhez

A `MegBus/Config/AppConfig.swift`-ben lévő `backendServerURL`-t állítsd a domainedre:

```swift
static let backendServerURL = URL(string: "https://DOMAIN")!
```

A `socket.io-client-swift` HTTPS URL esetén automatikusan WSS-re (titkosított
WebSocket) vált — ez éles App Store-os buildhez amúgy is kötelező (App Transport
Security nem enged sima HTTP-t egy kiadott appban).

### A React Native (Expo) app bekötése éles szerverhez

A `mobile/` projektben a szerver címe a `EXPO_PUBLIC_SERVER_URL` env változóval
(vagy alapértelmezetten `mobile/src/services/config.ts`-ben) van megadva:

```
EXPO_PUBLIC_SERVER_URL=https://megbus.walkegabor.hu npx expo start
```

Éles buildhez (`eas build` / `expo run:ios`) ugyanezt az env változót kell
beállítani build időben, vagy egyszerűen átírni a `config.ts`-ben lévő
alapértelmezett URL-t.
