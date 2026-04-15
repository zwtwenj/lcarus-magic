import { h, defineComponent, ref, render, createVNode } from 'vue'
import type { Component, Ref } from 'vue'
import { ElDialog, type DialogProps } from 'element-plus'
import { v4 as uuidv4 } from 'uuid'
import { app } from '../main'

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
          default: () => h(component, { 
            ...props, 
            onClose: close
          }),
        }
      )
    }
  })

  // 使用导入的 app 实例创建对话框
  const vnode = createVNode(DialogWrapper)
  // 确保使用主应用的上下文，这样 Element Plus 组件就能被识别
  vnode.appContext = app._context
  render(vnode, container)

  const dialogId = uuidv4()
  if (!window.dialogs) {
    window.dialogs = {}
  }
  window.dialogs[dialogId] = { close }

  return vnode
}
