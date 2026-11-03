import { expect, test } from 'claude-code/testing'

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
