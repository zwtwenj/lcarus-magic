import { createRouter, createWebHashHistory } from 'vue-router'
import LoginView from '../views/login/index.vue'
import Layout from '../views/Layout/index.vue'
import ProjectsView from '../views/projects/index.vue'
import TasksView from '../views/tasks/index.vue'
import LayoutProject from '../views/LayoutProject/index.vue'
import { useProjectStore } from '../store/project.store'
import { ElMessage } from 'element-plus'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: Layout,
      children: [
        {
          path: 'projects',
          name: 'projects',
          component: ProjectsView,
        },
        {
          path: 'tasks',
          name: 'tasks',
          component: TasksView,
        },
      ],
    },
    {
      // 项目空间
      path: '/projectSpace',
      name: 'projectSpace',
      component: LayoutProject,
      // 进入前预取项目数据，保证所有子页挂载时 store 已就绪
      beforeEnter: async (to) => {
        const id = to.query.id as string | undefined
        const projectStore = useProjectStore()
        projectStore.$reset()
        // 同步菜单高亮（守卫中设置，避免子组件挂载时高亮错位）
        const menuKey = to.path.split('/').pop() || 'overview'
        projectStore.currentMenu = menuKey
        if (id) {
          try {
            await projectStore.fetchProjectDetail(Number(id))
          } catch (error) {
            console.error('获取项目信息失败:', error)
            ElMessage.error('获取项目信息失败')
          }
        }
      },
      children: [
        {
          path: 'overview',
          name: 'overview',
          component: () => import('../views/projects/overview.vue'),
        },
        {
          path: 'text',
          name: 'text',
          component: () => import('../views/projects/text.vue'),
        },
        {
          path: 'materials',
          name: 'materials',
          component: () => import('../views/projects/materials.vue'),
        },
        {
          path: 'sound',
          name: 'sound',
          component: () => import('../views/projects/sound.vue'),
        },
        {
          path: 'subtitle',
          name: 'subtitle',
          component: () => import('../views/projects/subtitle.vue'),
        },
        {
          path: 'generate',
          name: 'generate',
          component: () => import('../views/projects/generate.vue'),
        },
        {
          path: 'video',
          name: 'video',
          component: () => import('../views/projects/video.vue'),
        },
        {
          path: 'task',
          name: 'task',
          component: () => import('../views/projects/task.vue'),
        },
      ],
    },
    {
      path: '/login',
      name: 'login',
      component: LoginView,
    },
  ],
})

export default router