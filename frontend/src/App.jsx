// The route table: which page component is shown for which URL.
import { Route, Routes } from 'react-router'
import Layout from './components/Layout.jsx'
import BookDetailPage from './pages/BookDetailPage.jsx'
import BookFormPage from './pages/BookFormPage.jsx'
import BookListPage from './pages/BookListPage.jsx'
import GenresPage from './pages/GenresPage.jsx'
import NotFoundPage from './pages/NotFoundPage.jsx'

export default function App() {
  return (
    <Routes>
      {/* Layout has no path: it wraps every page below with the header and
          renders the matching child route where it places <Outlet />. */}
      <Route element={<Layout />}>
        <Route index element={<BookListPage />} />
        {/* "books/new" is matched before "books/:bookId", because React Router
            ranks fixed segments above dynamic ones whatever their order here. */}
        <Route path="books/new" element={<BookFormPage />} />
        <Route path="books/:bookId" element={<BookDetailPage />} />
        <Route path="books/:bookId/edit" element={<BookFormPage />} />
        <Route path="genres" element={<GenresPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
