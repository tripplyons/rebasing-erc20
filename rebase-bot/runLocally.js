const index = require('./index.js');

async function main() {
  await new Promise((resolve, reject) => {
    index.handler(null, null, resolve);
  });
}

main();
