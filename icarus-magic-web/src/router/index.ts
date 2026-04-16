import { createRouter, createWebHashHistory } from 'vue-router'
import LoginView from '../views/login/index.vue'
import Layout from '../views/Layout/index.vue'
import ProjectsView from '../views/projects/index.vue'
import TasksView from '../views/tasks/index.vue'
import LayoutProject from '../views/LayoutProject/index.vue'

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