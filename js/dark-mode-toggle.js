document.addEventListener('DOMContentLoaded', function () {
  const themeToggle = document.getElementById('theme-toggle')

  const savedTheme = localStorage.getItem('theme')
  if (
    savedTheme === 'dark' ||
    (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)
  ) {
    document.body.classList.add('dark-mode')
    themeToggle.textContent = 'Toggle Light Mode'
  }

  themeToggle.addEventListener('click', function () {
    document.body.classList.toggle('dark-mode')

    if (document.body.classList.contains('dark-mode')) {
      localStorage.setItem('theme', 'dark')
      themeToggle.textContent = 'Toggle Light Mode'
    } else {
      localStorage.setItem('theme', 'light')
      themeToggle.textContent = 'Toggle Dark Mode'
    }
  })
})
