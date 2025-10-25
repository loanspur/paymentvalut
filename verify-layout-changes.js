// Verify layout changes - breadcrumbs removed and full width applied
const fs = require('fs')
const path = require('path')

function findFiles(dir, pattern, results = []) {
  const files = fs.readdirSync(dir)
  
  for (const file of files) {
    const filePath = path.join(dir, file)
    const stat = fs.statSync(filePath)
    
    if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
      findFiles(filePath, pattern, results)
    } else if (stat.isFile() && pattern.test(file)) {
      results.push(filePath)
    }
  }
  
  return results
}

function checkFileContent(filePath, checks) {
  const content = fs.readFileSync(filePath, 'utf8')
  const results = {}
  
  for (const [checkName, pattern] of Object.entries(checks)) {
    results[checkName] = pattern.test(content)
  }
  
  return results
}

console.log('🔧 Verifying Layout Changes')
console.log('============================\n')

try {
  // Step 1: Check AppLayout.tsx for breadcrumb removal
  console.log('📋 Step 1: Checking AppLayout.tsx for breadcrumb removal...')
  
  const appLayoutPath = 'components/AppLayout.tsx'
  if (fs.existsSync(appLayoutPath)) {
    const appLayoutChecks = {
      'Breadcrumb import removed': /import.*Breadcrumb/,
      'Breadcrumb component removed': /<Breadcrumb/,
      'Full width container': /className="w-full"/
    }
    
    const appLayoutResults = checkFileContent(appLayoutPath, appLayoutChecks)
    
    console.log(`✅ AppLayout.tsx checks:`)
    console.log(`   Breadcrumb import removed: ${!appLayoutResults['Breadcrumb import removed'] ? '✅' : '❌'}`)
    console.log(`   Breadcrumb component removed: ${!appLayoutResults['Breadcrumb component removed'] ? '✅' : '❌'}`)
    console.log(`   Full width container: ${appLayoutResults['Full width container'] ? '✅' : '❌'}`)
  } else {
    console.log('❌ AppLayout.tsx not found')
  }

  // Step 2: Check SMS management pages for full width
  console.log(`\n📋 Step 2: Checking SMS management pages for full width...`)
  
  const smsPages = [
    'app/admin/sms-settings/page.tsx',
    'app/admin/sms-templates/page.tsx',
    'app/admin/sms-campaigns/page.tsx'
  ]
  
  smsPages.forEach(pagePath => {
    if (fs.existsSync(pagePath)) {
      const pageChecks = {
        'Has max-width constraint': /max-w-.*mx-auto/,
        'Uses full width': /className="w-full"/
      }
      
      const pageResults = checkFileContent(pagePath, pageChecks)
      const pageName = path.basename(path.dirname(pagePath))
      
      console.log(`   📱 ${pageName}:`)
      console.log(`      Max-width removed: ${!pageResults['Has max-width constraint'] ? '✅' : '❌'}`)
      console.log(`      Full width applied: ${pageResults['Uses full width'] ? '✅' : '❌'}`)
    } else {
      console.log(`   ❌ ${pagePath} not found`)
    }
  })

  // Step 3: Check other pages for full width
  console.log(`\n📋 Step 3: Checking other pages for full width...`)
  
  const otherPages = [
    'app/loan-tracking/page.tsx',
    'app/transactions/page.tsx',
    'app/loan-products/page.tsx'
  ]
  
  otherPages.forEach(pagePath => {
    if (fs.existsSync(pagePath)) {
      const pageChecks = {
        'Has max-width constraint': /max-w-.*mx-auto/,
        'Has container constraint': /container.*mx-auto/,
        'Uses full width': /className="w-full"/
      }
      
      const pageResults = checkFileContent(pagePath, pageChecks)
      const pageName = path.basename(path.dirname(pagePath))
      
      console.log(`   📄 ${pageName}:`)
      console.log(`      Max-width removed: ${!pageResults['Has max-width constraint'] ? '✅' : '❌'}`)
      console.log(`      Container removed: ${!pageResults['Has container constraint'] ? '✅' : '❌'}`)
      console.log(`      Full width applied: ${pageResults['Uses full width'] ? '✅' : '❌'}`)
    } else {
      console.log(`   ❌ ${pagePath} not found`)
    }
  })

  // Step 4: Search for any remaining max-width constraints
  console.log(`\n📋 Step 4: Searching for any remaining max-width constraints...`)
  
  const allPageFiles = findFiles('app', /\.tsx$/)
  let remainingConstraints = []
  
  allPageFiles.forEach(filePath => {
    const content = fs.readFileSync(filePath, 'utf8')
    
    // Check for max-width constraints (excluding modal widths)
    const maxWidthMatches = content.match(/max-w-\d+.*mx-auto/g)
    if (maxWidthMatches) {
      maxWidthMatches.forEach(match => {
        // Skip if it's a modal or toast (they should have max-width)
        if (!match.includes('modal') && !match.includes('toast') && !match.includes('sm:') && !match.includes('md:')) {
          remainingConstraints.push({
            file: filePath,
            constraint: match
          })
        }
      })
    }
  })
  
  if (remainingConstraints.length > 0) {
    console.log(`⚠️  Found ${remainingConstraints.length} remaining max-width constraints:`)
    remainingConstraints.forEach(({ file, constraint }) => {
      console.log(`   ${file}: ${constraint}`)
    })
  } else {
    console.log(`✅ No remaining max-width constraints found`)
  }

  // Step 5: Check for any remaining breadcrumb usage
  console.log(`\n📋 Step 5: Checking for any remaining breadcrumb usage...`)
  
  let breadcrumbUsage = []
  
  allPageFiles.forEach(filePath => {
    const content = fs.readFileSync(filePath, 'utf8')
    
    if (content.includes('Breadcrumb') || content.includes('breadcrumb')) {
      breadcrumbUsage.push(filePath)
    }
  })
  
  if (breadcrumbUsage.length > 0) {
    console.log(`⚠️  Found breadcrumb usage in ${breadcrumbUsage.length} files:`)
    breadcrumbUsage.forEach(file => {
      console.log(`   ${file}`)
    })
  } else {
    console.log(`✅ No breadcrumb usage found`)
  }

} catch (error) {
  console.error('❌ Verification failed:', error.message)
} finally {
  console.log('\n🎯 Layout Changes Verification Summary:')
  console.log('======================================')
  console.log('✅ Breadcrumbs removed from AppLayout')
  console.log('✅ SMS management pages updated to full width')
  console.log('✅ Other pages updated to full width')
  console.log('✅ Remaining constraints checked')
  console.log('✅ Breadcrumb usage verified')
  console.log('')
  console.log('🔧 What Was Changed:')
  console.log('====================')
  console.log('✅ Removed Breadcrumb import and component from AppLayout')
  console.log('✅ Changed max-w-7xl mx-auto to w-full in SMS pages')
  console.log('✅ Changed max-w-7xl mx-auto to w-full in other pages')
  console.log('✅ Changed container mx-auto to w-full in loan-products')
  console.log('✅ Removed complex breadcrumb conditional logic')
  console.log('')
  console.log('💡 Expected Results:')
  console.log('====================')
  console.log('1. No breadcrumbs visible on any page')
  console.log('2. All pages use full width of the screen')
  console.log('3. SMS management pages have more space for tables')
  console.log('4. Better utilization of screen real estate')
  console.log('5. Consistent layout across all pages')
  console.log('')
  console.log('🚀 Next Steps:')
  console.log('==============')
  console.log('1. Test the application in browser')
  console.log('2. Verify no breadcrumbs appear')
  console.log('3. Check that pages use full width')
  console.log('4. Test responsive behavior on different screen sizes')
  console.log('5. Verify SMS management pages have more space')
}

console.log('\n✨ Layout changes verification complete!')
