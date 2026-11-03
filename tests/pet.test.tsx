import { expect, mock, test } from 'claude-code/testing'

const band = (isWorking: boolean) =>
  ({
    plugin: 'dancing-pet',
    component: 'AbovePrompt',
    requestId: 'band',
    surface: 'terminal',
    props: { hasSurvey: false, isWorking, maxRows: 20, bodyColumns: 80, scroll: { offset: 0, bodyRows: 20 }, view: {} },
  }) as const

test('the pet dances while Claude works', async ($, on) => {
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text>engine</Text>
  })

  const ui = await $.ui.mount(band(true))
  const pet = await ui.find({ type: 'Raster', key: 'pet' })
  expect(pet?.props.columns).toBe(29)
  expect(pet?.props.rows).toBe(11)
  expect((await ui.find({ type: 'Text', text: /\.\.\./ }))?.text).toBe('Working ...')
  await ui.unmount()
})

test('the pet hides when Claude is idle', async ($, on) => {
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text>engine</Text>
  })

  const ui = await $.ui.mount(band(false))
  expect(await ui.find({ type: 'Raster', key: 'pet' })).toBeUndefined()
  expect((await ui.find({ type: 'Text', text: /engine/ }))?.text).toBe('engine')
  await ui.unmount()
})

const pet = (args = '') =>
  ({
    command: 'pet',
    args,
    origin: { kind: 'composer' },
    presentation: { isFullscreen: false, columns: 80 },
  }) as const

test('/pet switches the pet off and on', async ($, on) => {
  mock.store(on)
  on('command.register', () => ({ value: { command: 'pet' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text>engine</Text>
  })
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })

  const off = await $.command.run(pet())
  expect(off).toEqual({ text: 'Dancing pet off. Run /pet to bring it back.' })
  let ui = await $.ui.mount(band(true))
  expect(await ui.find({ type: 'Raster', key: 'pet' })).toBeUndefined()
  await ui.unmount()

  await $.command.run(pet('on'))
  ui = await $.ui.mount(band(true))
  expect(await ui.find({ type: 'Raster', key: 'pet' })).toBeDefined()
  await ui.unmount()

  const bad = await $.command.run(pet('dance'))
  expect(bad).toEqual({ text: 'Usage: /pet [on|off]. With no argument, /pet switches the pet on or off.' })
})

test('the pet stays off in a new session when it was turned off', async ($, on) => {
  mock.store(on, { enabled: false })
  on('command.register', () => ({ value: { command: 'pet' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text>engine</Text>
  })
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })

  const ui = await $.ui.mount(band(true))
  expect(await ui.find({ type: 'Raster', key: 'pet' })).toBeUndefined()
  await ui.unmount()
})
