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

### Az iOS app bekötése éles szerverhez

A `MegBus/ContentView.swift`-ben lévő `backendServerURL`-t állítsd a domainedre:

```swift
private let backendServerURL = URL(string: "https://DOMAIN")!
```

A `socket.io-client-swift` HTTPS URL esetén automatikusan WSS-re (titkosított
WebSocket) vált — ez éles App Store-os buildhez amúgy is kötelező (App Transport
Security nem enged sima HTTP-t egy kiadott appban).
