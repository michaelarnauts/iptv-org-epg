jest.mock('axios', () => ({
  get: jest.fn()
}))

const axios = require('axios')
const { channels, parser, url } = require('./vtm.be.config.js')
const fs = require('fs')
const path = require('path')
const dayjs = require('dayjs')
const utc = require('dayjs/plugin/utc')
const customParseFormat = require('dayjs/plugin/customParseFormat')

dayjs.extend(customParseFormat)
dayjs.extend(utc)

const date = dayjs.utc('2026-08-11', 'YYYY-MM-DD').startOf('d')
const channel = { site_id: 'vtm', xmltv_id: 'VTM.be@SD' }
const content = fs.readFileSync(path.resolve(__dirname, '__data__/content.json'), 'utf8')

beforeEach(() => {
  axios.get.mockReset()
})

it('can generate valid url', () => {
  expect(url({ channel, date })).toBe('https://vtm.be/tv-gids/api/v2/broadcasts/2026-08-11')
})

it('can parse response', () => {
  const results = parser({ content, channel, date }).map(program => {
    program.start = program.start.toJSON()
    program.stop = program.stop.toJSON()
    return program
  })

  expect(results).toHaveLength(4)
  expect(results[1]).toMatchObject({
    title: 'Kabouter Plop',
    subTitle: 'Een gat in het dak',
    description:
      'Het regent pijpenstelen en kabouter Lui valt er heerlijk van in slaap. Lang duurt zijn rust niet: hij wordt wakker van dikke regendruppels op zijn gezicht!',
    category: ['Reeks', 'Kleuter'],
    keywords: [],
    rating: { system: 'VTM', value: 'AL' },
    country: ['België'],
    length: { units: 'seconds', value: '300' },
    image:
      'https://images3.persgroep.net/rcs/SiNT8MdHiiJ_5aad9t0s6S8KVmU/diocontent/175276626/_fill/600/400?appId=da11c75db9b73ea0f41f0cd0da631c71',
    url: [
      'https://www.vtmgo.be/vtmgo/afspelen/e75f80c1-2c04-41f1-ba71-c190ac0009c2',
      'https://link.vtmgo.be/vtmgo/kabouter-plop~50803719-c589-421d-a578-249e3759c32d'
    ],
    start: '2026-08-11T04:05:00.000Z',
    stop: '2026-08-11T04:10:00.000Z'
  })
})

it('can parse age rating and content descriptors', () => {
  const results = parser({ content, channel, date })
  const program = results.find(program => program.title === 'VLOGLAB #Stories')

  expect(program).toMatchObject({
    rating: { system: 'VTM', value: '6' },
    keywords: ['Geweld', 'Angst', 'Grof taalgebruik']
  })
})

it('marks live broadcasts', () => {
  const results = parser({ content, channel, date })
  const program = results.find(program => program.title === 'VTM NIEUWS')

  expect(program.keywords).toEqual(['Live'])
})

it('does not repeat the title as sub-title', () => {
  const results = parser({ content, channel, date })
  const program = results.find(program => program.title === 'Geen uitzending')

  expect(program.subTitle).toBeNull()
  expect(program.rating).toBeNull()
})

it('only returns the requested channel', () => {
  const results = parser({ content, channel: { site_id: 'vtm2' }, date })

  expect(results).toHaveLength(1)
  expect(results[0].title).toBe(
    'FK Bodø/Glimt - Union Saint-Gilloise: voorronde Champions League'
  )
})

it('can parse channel list', async () => {
  axios.get.mockResolvedValue({ data: JSON.parse(content) })

  const results = await channels()

  expect(results).toMatchObject([
    {
      lang: 'nl',
      site_id: 'vtm',
      name: 'VTM',
      logo: 'https://images4.persgroep.net/rcs/5z5qDnGS5kcM_mNLtWSlF_JPvd0/diocontent/248189477/_fitwidth/500?appId=da11c75db9b73ea0f41f0cd0da631c71'
    },
    { lang: 'nl', site_id: 'vtm2', name: 'VTM 2' },
    { lang: 'nl', site_id: 'vtm3', name: 'VTM 3' }
  ])
})

it('can handle empty guide', () => {
  expect(parser({ content: '', channel, date })).toMatchObject([])
  expect(parser({ content: '<html>consent</html>', channel, date })).toMatchObject([])
})
