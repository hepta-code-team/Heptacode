Was sind die steps ?
Du brauchst zuerst eine neue version von node.js.#

# 1. Repo klonen
git clone https://github.com/euer-repo/heptacode.git
cd heptacode

# 2. Leere .env.local anlegen
touch .env.local        # Mac
New-Item .env.local     # Windows PowerShell

# 3. Node modules lokal installieren (nur für VS Code - keine roten Fehler)
cd frontend && npm install
cd ../backend && npm install

# 4. Zurück in root und starten
cd ..
make dev