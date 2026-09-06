import '@fontsource-variable/geist'
import '@fontsource-variable/geist-mono'
import './style.css'

import { initCode } from './code'
import { $ } from './lib/dom'
import { mountPanel } from './panel'
import { requestRender } from './preview'
import { store } from './state'

mountPanel($('#panel'))
initCode()

store.subscribe(requestRender)
requestRender()
