git clone $1 repo

cd repo

npm init -y

tsc --init

# Make a dockerfile (Future)

git add .

git commit -m "Setup"

git push origin main

cd ..

rm -rf repo