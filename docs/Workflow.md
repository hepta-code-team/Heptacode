**Wie sieht der nromale Workflow aus?**

# 1 Die neuste Version holen
- git pull 

# 2 Nur!!!! Wenn neue Pakete im front- oder Backend hinzugefügt worden sind.
Leute die npm haben:
- cd frontend && npm install
- ../ cd backend && npm install

Leute die npm nicht lokal haben:
- docker compose -f docker-compose.dev.yml run --rm frontend npm install
- docker compose -f docker-compose.dev.yml run --rm backend npm install

# 3 Container starten 
- make dev

# 4 Code schreiben 
# -> auf localhost:5173 im Browser anschauen

# 5 fertig, dann pushen 
- git branch
- git add .
- git commit -m "Was wurde geändert"
- git push


# Sonderfälle:
- wenn wir die Anwendung deployen wollen bzw. testen wollen
    - make prod

- Wenn etwas kaputt geht, in Dockerfile hat sich was geändert oder du willst neu anfangen 
    - make clean

- wenn ports schon belegt wurden (bsp. 5173 is already running)
    - make down --> make dev



