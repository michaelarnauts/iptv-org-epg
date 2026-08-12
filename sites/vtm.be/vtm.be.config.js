const axios = require('axios')
const dayjs = require('dayjs')

const apiEndpoint = 'https://vtm.be/tv-gids/api/v2/broadcasts'
const playerUrl = 'https://www.vtmgo.be/vtmgo/afspelen'

// The consent gate bounces every request without an authId cookie, but never checks its value.
const request = {
  headers: {
    Cookie: 'authId=iptv-org'
  }
}

const descriptors = {
  VIOLENCE: 'Geweld',
  SCARY: 'Angst',
  SEXUAL: 'Seks',
  DISCRIMINATION: 'Discriminatie',
  DRUGS: 'Drugs en alcohol',
  STRONG_LANGUAGE: 'Grof taalgebruik'
}

module.exports = {
  site: 'vtm.be',
  days: 8, // the guide runs from two days back to seven days ahead
  request,
  url({ date }) {
    return `${apiEndpoint}/${date.format('YYYY-MM-DD')}`
  },
  parser({ content, channel }) {
    return parseBroadcasts(content, channel).map(item => ({
      title: item.title,
      subTitle: parseSubTitle(item),
      description: item.synopsis || null,
      category: [item.genre, ...(item.subGenres || [])].filter(Boolean),
      keywords: parseKeywords(item),
      rating: parseRating(item),
      country: (item.productionCountries || []).map(country => country.name).filter(Boolean),
      length: item.duration ? { units: 'seconds', value: String(item.duration) } : null,
      image: item.imageUrl || null,
      url: parseUrls(item),
      start: dayjs(item.from),
      stop: dayjs(item.to)
    }))
  },
  async channels() {
    const content = await axios
      .get(`${apiEndpoint}/${dayjs().format('YYYY-MM-DD')}`, request)
      .then(response => response.data)
      .catch(() => null)

    return parseChannels(content).map(channel => ({
      lang: 'nl',
      site_id: channel.seoKey,
      name: channel.name,
      logo: channel.channelLogoUrl || null
    }))
  }
}

function parseChannels(content) {
  let data = content

  if (typeof content === 'string') {
    try {
      data = JSON.parse(content)
    } catch {
      return []
    }
  }

  return Array.isArray(data?.channels) ? data.channels.filter(channel => channel.seoKey) : []
}

// One response holds the whole day for every channel, so the channel is picked out here.
function parseBroadcasts(content, channel) {
  const item = parseChannels(content).find(item => item.seoKey === channel.site_id)

  return (item?.broadcasts || []).filter(broadcast => broadcast.title && broadcast.from)
}

function parseSubTitle(item) {
  const subTitle = item.alternativeDetailTitle

  return subTitle && subTitle !== item.title ? subTitle : null
}

// rerun and prime are false on every programme, so live is the only flag worth carrying over.
function parseKeywords(item) {
  const keywords = (item.descriptors || []).map(descriptor => descriptors[descriptor] || descriptor)

  if (item.live) keywords.unshift('Live')

  return keywords
}

// legalIcons mixes the age advice in with other markers, PP among them.
function parseRating(item) {
  const icon = (item.legalIcons || []).find(icon => /^PG(AL|\d+)$/.test(icon))
  if (!icon) return null

  return {
    system: 'VTM',
    value: icon === 'PGAL' ? 'AL' : icon.replace('PG', '')
  }
}

// The api's own link points at the programme, the playable uuid at the episode that aired.
function parseUrls(item) {
  const urls = []

  if (item.playableUuid) urls.push(`${playerUrl}/${item.playableUuid}`)

  for (const link of item.videoOnDemandLinks || []) {
    if (link.url && !urls.includes(link.url)) urls.push(link.url)
  }

  return urls
}
