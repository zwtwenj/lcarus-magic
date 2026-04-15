import { getCurrentInstance, h, createVNode, render, defineComponent, ref } from 'vue'
import type { Component, Ref } from 'vue'
import { ElDialog, type DialogProps } from 'element-plus'
import { v4 as uuidv4 } from 'uuid'

interface DialogConfig extends Partial<DialogProps> {
  customClass?: string
  modalClass?: string
  onClose?: () => void
  onClosed?: () => void
}

interface DialogInstance {
  close: () => void
}

declare global {
  interface Window {
    dialogs: Record<string, DialogInstance>
  }
}

export function createDialog(
  component: Component,
  props: Record<string, any> = {},
  dialogConfig: DialogConfig = {}
) {
  const inst = getCurrentInstance()
  const appContext = inst?.appContext
  const container = document.createElement('div')
  document.body.appendChild(container)
  const visible: Ref<boolean> = ref(true)

  const close = () => {
    visible.value = false
    const dialogId = Object.keys(window.dialogs || {}).find(id => window.dialogs[id]?.close === close)
    if (dialogId) {
      delete window.dialogs[dialogId]
    }
  }

  const mergedCustomClass = ['magic-dialog', dialogConfig.customClass].filter(Boolean).join(' ')
  const mergedModalClass = ['magic-dialog-overlay', dialogConfig.modalClass].filter(Boolean).join(' ')

  const DialogWrapper = defineComponent({
    setup() {
      return () => h(
        ElDialog,
        {
          modelValue: visible.value,
          closeOnClickModal: false,
          ...dialogConfig,
          class: mergedCustomClass,
          modalClass: mergedModalClass,
          'onUpdate:modelValue': (val: boolean) => {
            visible.value = val
          },
          onClose: () => {
            dialogConfig.onClose?.()
            close()
          },
          onClosed: () => {
            dialogConfig.onClosed?.()
            render(null, container)
            if (document.body.contains(container)) {
              document.body.removeChild(container)
            }
          },
        },
        {
          default: () => h(component, { ...props, onClose: close }),
        }
      )
    }
  })

  const vnode = createVNode(DialogWrapper)

  if (appContext) vnode.appContext = appContext
  render(vnode, container)

  const dialogId = uuidv4()
  if (!window.dialogs) {
    window.dialogs = {}
  }
  window.dialogs[dialogId] = { close }

  return vnode
}
