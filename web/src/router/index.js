import { createRouter, createWebHistory } from 'vue-router'
import MainLayout from '../layouts/MainLayout.vue'

const routes = [
    {
        path: '/login',
        name: 'Login',
        component: () => import('../views/Login/index.vue'),
    },
    {
        path: '/',
        component: MainLayout,
        children: [
            {
                path: '',
                name: 'Home',
                component: () => import('../views/Home.vue'),
            },
            {
                path: 'event',
                name: 'Event',
                component: () => import('../views/Event/index.vue'),
            },
            {
                path: 'generate',
                name: 'Generate',
                component: () => import('../views/generate/index.vue'),
            },
        ],
    },
]

export default createRouter({
    history: createWebHistory(),
    routes,
})
