import { createApp, h, type Component, type App } from 'vue'
import ElementPlus from 'element-plus'

interface DialogOptions {
  props?: Record<string, any>
  on?: {
    confirm?: (data: any) => void
    cancel?: () => void
  }
}

export function openDialog<T extends Component>(
  component: T,
  options: DialogOptions = {}
): App {
  const { props = {}, on = {} } = options

  const container = document.createElement('div')
  document.body.appendChild(container)

  const app = createApp({
    render() {
      return h(component, {
        modelValue: true,
        ...props,
        'onUpdate:modelValue': (val: boolean) => {
          if (!val) {
            setTimeout(() => {
              app.unmount()
              if (document.body.contains(container)) {
                document.body.removeChild(container)
              }
            }, 300)
          }
        },
        onConfirm: on.confirm,
        onCancel: on.cancel
      })
    }
  })

  app.use(ElementPlus)
  app.mount(container)

  return app
}
