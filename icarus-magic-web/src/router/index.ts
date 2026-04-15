import { createRouter, createWebHashHistory } from 'vue-router'
import LoginView from '../views/login/index.vue'
import Layout from '../views/Layout/index.vue'
import ProjectsView from '../views/projects/index.vue'
import TasksView from '../views/tasks/index.vue'

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
      path: '/login',
      name: 'login',
      component: LoginView,
    },
  ],
})

export default router
