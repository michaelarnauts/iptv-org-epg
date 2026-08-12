# vtm.be

https://vtm.be/tv-gids

### Download the guide

```sh
npm run grab --- --sites=vtm.be
```

### Update channel list

```sh
npm run channels:parse --- --config=./sites/vtm.be/vtm.be.config.js --output=./sites/vtm.be/vtm.be.channels.xml
```

### Test

```sh
npm test --- vtm.be
```
