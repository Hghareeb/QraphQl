'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { gql, useQuery, ApolloClient, InMemoryCache } from '@apollo/client';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

const getToken = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('token') || '';
  }
  return '';
};

const client = new ApolloClient({
  uri: 'https://learn.reboot01.com/api/graphql-engine/v1/graphql',
  cache: new InMemoryCache(),
  headers: {
    'Authorization': `Bearer ${getToken()}`
  }
});

const GET_USER_DATA = gql`
  query($userId: Int!, $eventId: Int!) {
    user(where: {id: {_eq: $userId}}) {
      id
      login
      firstName
      lastName
      email
      auditRatio
      totalUp
      totalDown
      campus
      xp_transactions: transactions(
        where: { 
          userId: { _eq: $userId },
          type: { _eq: "xp" },
          eventId: { _eq: $eventId }
        },
        order_by: { createdAt: desc }
      ) {
        id
        amount
        createdAt
        path
        object {
          id
          name
          type
        }
      }
      audits: audits_aggregate(
        where: {
          auditorId: {_eq: $userId},
          grade: {_is_null: false}
        }
      ) {
        nodes {
          id
          grade
          createdAt
          group {
            captainLogin
            object {
              name
            }
          }
        }
        aggregate {
          count
          avg {
            grade
          }
        }
      }
      progresses(
        where: { 
          userId: { _eq: $userId }, 
          object: { type: { _eq: "project" } }
        }, 
        order_by: {updatedAt: desc}
      ) {
        id
        object {
          id
          name
          type
        }
        grade
        createdAt
        updatedAt
      }
      skills: transactions(
        order_by: [{type: desc}, {amount: desc}],
        distinct_on: [type],
        where: {
          userId: {_eq: $userId}, 
          type: {_in: ["skill_js", "skill_go", "skill_html", "skill_prog", "skill_front-end", "skill_back-end"]}
        }
      ) {
        type
        amount
      }
    }
    event_user(where: { userId: { _eq: $userId }, eventId: {_eq: $eventId}}) {
      level
    }
  }
`;

const formatBytes = (bytes) => {
  if (bytes === 0) return '0';
  return bytes.toFixed(2);
};

const formatToMB = (bytes) => {
  if (bytes === 0) return '0 MB';
  const mb = bytes / 1000000;
  return `${mb.toFixed(2)} MB`;
};

const formatTransactionName = (path) => {
  return path
    .split('/')
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' - ');
};

const getSkillColor = (type) => {
  const colors = {
    'skill_algo': { start: '#FF6B6B', end: '#FF8787', icon: '🔄' },
    'skill_prog': { start: '#4ECDC4', end: '#45B7AF', icon: '💻' },
    'skill_front': { start: '#96CEB4', end: '#88BEA6', icon: '🎨' },
    'skill_back': { start: '#9D94FF', end: '#8A82E8', icon: '⚙️' },
    'skill_sys': { start: '#FFD93D', end: '#FFD23F', icon: '🖥️' },
    default: { start: '#6C757D', end: '#495057', icon: '📚' }
  };
  return colors[type] || colors.default;
};

const calculatePieSlice = (value, total, startAngle, radius = 1) => {
  const percentage = (value / total) * 360;
  const x1 = Math.cos((startAngle * Math.PI) / 180) * radius;
  const y1 = Math.sin((startAngle * Math.PI) / 180) * radius;
  const x2 = Math.cos(((startAngle + percentage) * Math.PI) / 180) * radius;
  const y2 = Math.sin(((startAngle + percentage) * Math.PI) / 180) * radius;
  
  const largeArcFlag = percentage > 180 ? 1 : 0;
  
  return {
    path: `M 0 0 L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`,
    percentage,
    endAngle: startAngle + percentage,
    midAngle: startAngle + percentage / 2
  };
};

const SkillsRadarChart = ({ skills }) => {
  const totalSkillPoints = skills.reduce((sum, s) => sum + s.amount, 0);
  const centerX = 150;
  const centerY = 150;
  const radius = 100;
  
  // Generate points for the radar chart
  const getPointCoordinates = (index, value) => {
    const angle = (Math.PI * 2 * index) / skills.length - Math.PI / 2;
    const normalizedValue = (value / totalSkillPoints) * radius * 2; // Multiply by 2 to make the chart fill more space
    return {
      x: centerX + normalizedValue * Math.cos(angle),
      y: centerY + normalizedValue * Math.sin(angle)
    };
  };

  // Generate points for the radar grid
  const generateGridPoints = (level) => {
    const points = [];
    for (let i = 0; i < skills.length; i++) {
      const angle = (Math.PI * 2 * i) / skills.length - Math.PI / 2;
      const value = radius * level;
      points.push({
        x: centerX + value * Math.cos(angle),
        y: centerY + value * Math.sin(angle)
      });
    }
    return points;
  };

  // Generate the path for the skills shape
  const generateSkillsPath = () => {
    return skills.map((skill, index) => {
      const point = getPointCoordinates(index, skill.amount);
      return (index === 0 ? 'M' : 'L') + `${point.x},${point.y}`;
    }).join(' ') + 'Z';
  };

  // Generate grid levels (20%, 40%, 60%, 80%, 100%)
  const gridLevels = [0.2, 0.4, 0.6, 0.8, 1];

  return (
    <svg width="300" height="300" className="w-full">
      {/* Background grid */}
      {gridLevels.map((level) => (
        <path
          key={level}
          d={generateGridPoints(level).map((point, i) => 
            `${i === 0 ? 'M' : 'L'}${point.x},${point.y}`
          ).join(' ') + 'Z'}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth="1"
        />
      ))}
      
      {/* Axis lines */}
      {skills.map((_, index) => {
        const point = getPointCoordinates(index, totalSkillPoints / skills.length);
        return (
          <line
            key={index}
            x1={centerX}
            y1={centerY}
            x2={point.x}
            y2={point.y}
            stroke="#e5e7eb"
            strokeWidth="1"
          />
        );
      })}

      {/* Skills shape */}
      <path
        d={generateSkillsPath()}
        fill="rgba(59, 130, 246, 0.2)"
        stroke="#3b82f6"
        strokeWidth="2"
      />

      {/* Skill points */}
      {skills.map((skill, index) => {
        const point = getPointCoordinates(index, skill.amount);
        return (
          <circle
            key={index}
            cx={point.x}
            cy={point.y}
            r="4"
            fill="#3b82f6"
          />
        );
      })}

      {/* Skill labels */}
      {skills.map((skill, index) => {
        const point = getPointCoordinates(index, totalSkillPoints / skills.length * 1.2);
        const skillName = skill.type.replace('skill_', '').replace('-', ' ').toUpperCase();
        return (
          <text
            key={index}
            x={point.x}
            y={point.y}
            textAnchor="middle"
            dominantBaseline="middle"
            className="text-xs font-medium fill-gray-600"
          >
            {skillName}
          </text>
        );
      })}
    </svg>
  );
};

const SkillsPieChart = ({ skills }) => {
  const colors = {
    'skill_js': '#F7DF1E',
    'skill_go': '#00ADD8',
    'skill_html': '#E34F26',
    'skill_prog': '#4B0082',
    'skill_front-end': '#61DAFB',
    'skill_back-end': '#3C873A'
  };

  const skillNames = {
    'skill_js': 'JavaScript',
    'skill_go': 'Go',
    'skill_html': 'HTML',
    'skill_prog': 'Programming',
    'skill_front-end': 'Front-End',
    'skill_back-end': 'Back-End'
  };

  // Format data for Recharts
  const chartData = skills.map(skill => ({
    id: skill.type,
    name: skillNames[skill.type] || skill.type.replace('skill_', '').replace('-', ' ').toUpperCase(),
    value: parseFloat(skill.amount),
    color: colors[skill.type] || '#CBD5E0'
  })).sort((a, b) => b.value - a.value);

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-800 text-white px-4 py-2 rounded-lg text-sm shadow-lg">
          <p>{`${payload[0].payload.name}: ${payload[0].value.toFixed(1)}%`}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full">
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius="60%"
              outerRadius="80%"
              paddingAngle={2}
            >
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.color}
                  className="transition-all duration-200 hover:opacity-80"
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="mt-8 grid grid-cols-2 gap-x-8 gap-y-4">
        {chartData.map((skill) => (
          <div key={skill.id} className="flex items-center space-x-3 px-4 py-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: skill.color }}
            />
            <span className="text-sm font-medium text-gray-700">
              {skill.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function Profile() {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [userId, setUserId] = useState(null);
  const [eventId, setEventId] = useState(null);
  const [showAllActivity, setShowAllActivity] = useState(false);
  const [showAllProjects, setShowAllProjects] = useState(false);
  const [showAllAudits, setShowAllAudits] = useState(false);
  const [auditFilter, setAuditFilter] = useState('passed');
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedToken = localStorage.getItem('token');
      setToken(storedToken || '');
      
      if (!storedToken) {
        router.push('/');
        return;
      }

      // Decode token and extract user ID
      try {
        const base64Url = storedToken.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => 
          '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
        ).join(''));
        const decoded = JSON.parse(jsonPayload);
        setUserId(decoded.user.id);
        setEventId(decoded.user.eventId);
      } catch (error) {
        console.error('Error extracting user ID:', error);
        if (typeof window !== 'undefined') {
          localStorage.removeItem('token');
        }
        router.push('/');
      }
    }
  }, [router]);

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
    }
    router.push('/');
  };

  const { loading, error, data, refetch } = useQuery(GET_USER_DATA, {
    variables: {
      userId: userId || 0,
      eventId: eventId || 0
    },
    context: {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    },
    fetchPolicy: 'network-only',
    pollInterval: 30000,
    onError: (error) => {
      console.error('GraphQL Error:', error);
      if (error.message.includes('JWSInvalidSignature') || 
          error.message.includes('Could not verify JWT') || 
          error.message.includes('invalid token')) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('token');
        }
        router.push('/');
      }
    },
    skip: !userId
  });

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/');
      return;
    }

    // Check if token is expired
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      console.log('Token payload in useEffect:', payload);
      
      if (payload.exp * 1000 < Date.now()) {
        console.log('Token expired');
        if (typeof window !== 'undefined') {
          localStorage.removeItem('token');
        }
        router.push('/');
      }
    } catch (error) {
      console.error('Token validation error:', error);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
      }
      router.push('/');
    }

    // Initial data fetch
    if (userId) {
      console.log('Fetching data for user ID:', userId);
      refetch();
    }
  }, [router, refetch, userId]);

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>
  );

  if (error) {
    console.error('GraphQL Error:', error);
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-red-500">Error: {error.message}</div>
      </div>
    );
  }

  // Debug logging
  console.log('GraphQL Response:', data);
  console.log('User ID:', userId);

  // Access the first user from the array
  const user = data?.user?.[0];
  if (!user) {
    console.error('No user data found');
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-red-500">No user data found</div>
      </div>
    );
  }

  const allTransactions = user.xp_transactions || [];
  const displayedTransactions = showAllActivity ? allTransactions : allTransactions.slice(0, 5);
  const audits = user.audits?.nodes || [];
  const filteredAudits = audits.filter(audit => {
    if (auditFilter === 'passed') return audit.grade >= 1;
    if (auditFilter === 'failed') return audit.grade < 1;
    return true;
  });
  const displayedAudits = (filteredAudits || [])
    .slice(0, showAllAudits ? undefined : 4);

  // Debug logging for specific sections
  console.log('Transactions:', allTransactions);
  console.log('Audits:', audits);
  console.log('Skills:', user.skills);

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-700 to-purple-800 relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:16px_16px]"></div>
        <div className="absolute h-full w-full bg-gradient-to-b from-black/[0.07] to-black/[0.1]"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 relative">
          <div className="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
            <div className="flex items-center space-x-4">
              <div className="relative group">
                <div className="w-16 h-16 rounded-full overflow-hidden ring-2 ring-white/10 transition-transform duration-300 transform group-hover:scale-105 bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                  <span className="text-2xl font-bold text-white">
                    {user.login?.[0]?.toUpperCase()}
                  </span>
                </div>
                <div className="absolute -bottom-1 -right-1">
                  <div className="w-5 h-5 rounded-full bg-green-500 ring-2 ring-indigo-900 flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white mb-0.5 flex items-center">
                  {user.firstName} {user.lastName}
                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-white/10 text-white/90">
                    {user.login}
                  </span>
                </h1>
                <div className="flex items-center space-x-3">
                  <div className="flex items-center text-indigo-100/80 text-sm">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <span>{user.email}</span>
                  </div>
                  <div className="flex items-center text-indigo-100/80 text-sm">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Bahrain</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex space-x-2">
              <button 
                className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-sm rounded-lg transition-colors duration-200 flex items-center"
                onClick={() => window.open('https://learn.reboot01.com/intra', '_blank')}
              >
                <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                View Intra
              </button>
              <button 
                className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-100 text-sm rounded-lg transition-colors duration-200 flex items-center"
                onClick={handleLogout}
              >
                <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {/* Total XP */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 rounded-lg bg-yellow-100 text-yellow-600 flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <h2 className="text-sm font-medium text-gray-500">Total XP</h2>
                <div className="flex items-baseline">
                  <p className="text-2xl font-bold text-gray-900">
                    {user.xp_transactions?.reduce((sum, t) => sum + (t.amount || 0), 0)?.toLocaleString()}
                  </p>
                  <span className="ml-2 text-sm text-yellow-600">
                    XP
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Audit Ratio */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0h2a2 2 0 002 2v-4a2 2 0 00-2-2h-2zm0 0h2a2 2 0 002 2v4a2 2 0 00-2 2h-2a2 2 0 00-2-2v-4z" />
                </svg>
              </div>
              <div className="ml-4">
                <h2 className="text-sm font-medium text-gray-500">Audit Ratio</h2>
                <div className="flex items-center">
                  <p className="text-2xl font-bold text-gray-900">
                    {(user.auditRatio || 0).toFixed(1)}
                  </p>
                  <span className="ml-2 text-sm text-gray-500">Done/Received</span>
                </div>
              </div>
            </div>
          </div>

          {/* Audits Done */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 rounded-lg bg-green-100 text-green-600 flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
              </div>
              <div className="ml-4">
                <h2 className="text-sm font-medium text-gray-500">Completed</h2>
                <div className="flex items-center">
                  <p className="text-2xl font-bold text-gray-900">
                    {user.audits?.nodes?.filter(a => a.grade >= 1)?.length || 0}
                  </p>
                  <span className="ml-2 text-sm text-green-600">
                    Completed
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Projects Completed */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </div>
              <div className="ml-4">
                <h2 className="text-sm font-medium text-gray-500">Projects Completed</h2>
                <div className="flex items-center">
                  <p className="text-2xl font-bold text-gray-900">
                    {user.xp_transactions?.filter(t => t.object?.type?.toLowerCase() === 'project')?.length || 0}
                  </p>
                  <span className="ml-2 text-sm text-purple-600">
                    {user.xp_transactions?.filter(t => t.object?.type?.toLowerCase() === 'project')?.reduce((sum, t) => sum + t.amount, 0)?.toLocaleString()} XP
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Level and Audit Stats Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Level Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
            <div className="flex flex-col items-center text-center">
              <h3 className="text-gray-500 mb-1">Current rank</h3>
              <h2 className="text-2xl font-bold text-gray-900 mb-8">Apprentice developer</h2>
              
              <div className="relative w-48 h-48">
                {/* Circular dots */}
                <div className="absolute inset-0">
                  {[...Array(40)].map((_, i) => {
                    const angle = (i * 360) / 40;
                    const radius = 90;
                    const x = 96 + radius * Math.cos((angle - 90) * (Math.PI / 180));
                    const y = 96 + radius * Math.sin((angle - 90) * (Math.PI / 180));
                    return (
                      <div
                        key={i}
                        className={`absolute w-2 h-2 rounded-full ${
                          i < ((data?.event_user?.[0]?.level || 0) % 1) * 40
                            ? 'bg-indigo-600'
                            : 'bg-gray-200'
                        }`}
                        style={{
                          left: `${x}px`,
                          top: `${y}px`,
                          transform: 'translate(-50%, -50%)',
                        }}
                      />
                    );
                  })}
                </div>
                
                {/* Center circle with level */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-white rounded-full w-32 h-32 shadow-lg flex flex-col items-center justify-center">
                    <span className="text-sm text-gray-500">Level</span>
                    <span className="text-4xl font-bold text-gray-900">
                      {Math.floor(data?.event_user?.[0]?.level || 0)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Audit Stats Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
            <div className="flex flex-col">
              <h3 className="text-gray-500 mb-1">Audit Performance</h3>
              <div className="flex items-baseline mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  {(user.auditRatio || 0).toFixed(1)}
                </h2>
                <span className="ml-2 text-sm text-gray-500">ratio</span>
              </div>

              {/* Audit Bars */}
              <div className="space-y-6">
                {/* Done Audits Bar */}
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium text-gray-500">Done</span>
                    <span className="text-sm font-semibold text-gray-900">
                      {formatToMB(user.totalUp || 0)}
                    </span>
                  </div>
                  <div className="h-3 relative">
                    <div className="absolute inset-0 bg-blue-100 rounded-full"></div>
                    <div 
                      className="absolute inset-0 bg-blue-600 rounded-full"
                      style={{ 
                        width: `${Math.min(100, ((user.totalUp || 0) / (user.totalDown || 1)) * 100)}%`
                      }}
                    ></div>
                  </div>
                </div>

                {/* Received Audits Bar */}
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium text-gray-500">Received</span>
                    <span className="text-sm font-semibold text-gray-900">
                      {formatToMB(user.totalDown || 0)}
                    </span>
                  </div>
                  <div className="h-3 relative">
                    <div className="absolute inset-0 bg-green-100 rounded-full"></div>
                    <div 
                      className="absolute inset-0 bg-green-600 rounded-full"
                      style={{ 
                        width: '100%'
                      }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Legend */}
              <div className="flex space-x-4 mt-6">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-blue-600 rounded-full mr-2"></div>
                  <span className="text-sm text-gray-500">Done</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-green-600 rounded-full mr-2"></div>
                  <span className="text-sm text-gray-500">Received</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Projects and Skills */}
          <div className="space-y-8">
            {/* Skills Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="p-6">
                <h3 className="text-base font-semibold text-gray-900 mb-6">Skills Overview</h3>
                <SkillsPieChart skills={user.skills || []} />
              </div>
            </div>

            {/* Projects Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-base font-semibold text-gray-900">Recent Projects</h3>
                  <button 
                    onClick={() => setShowAllProjects(!showAllProjects)}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    {showAllProjects ? 'Show Less' : 'View All'}
                  </button>
                </div>
                <div className="space-y-4">
                  {(showAllProjects 
                    ? user.xp_transactions.filter(p => p.object?.type?.toLowerCase() === 'project')
                    : user.xp_transactions
                        .filter(p => p.object?.type?.toLowerCase() === 'project')
                        .slice(0, 4)
                  ).map((project) => {
                    const date = new Date(project.createdAt);
                    const formattedDate = new Intl.DateTimeFormat('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    }).format(date);

                    return (
                      <div 
                        key={`${project.id}-${project.createdAt}-${project.amount}`}
                        className="group relative flex items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-all duration-200"
                      >
                        <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                          </svg>
                        </div>
                        <div className="ml-4 flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                              {project.object?.name || project.path.split('/').pop()}
                            </p>
                            <span className="ml-2 text-sm text-gray-500">
                              {formattedDate}
                            </span>
                          </div>
                          <div className="flex items-center mt-1">
                            <span className="text-xs font-medium text-green-600 bg-green-100 px-2 py-0.5 rounded-full">
                              {Math.abs(project.amount) >= 1000 
                                ? `${(Math.abs(project.amount) / 1000).toFixed(1)}k XP`
                                : `${Math.abs(project.amount)} XP`}
                            </span>
                            {project.path && (
                              <span className="ml-2 text-xs text-gray-500 truncate">
                                {project.path.replace('/bahrain/bh-module', '').split('/').filter(Boolean).slice(0, -1).join('/')}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="ml-4">
                          <button 
                            className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-200 transition-all duration-200"
                            onClick={() => window.open(`https://learn.reboot01.com/intra/bahrain/bh-module${project.path.replace('/bahrain/bh-module', '')}?event=20`, '_blank')}
                            title="View Project"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Audits and Activity */}
          <div className="lg:col-span-2 space-y-8">
            {/* Recent Audits */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-semibold text-gray-900">Recent Audits</h3>
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center bg-gray-50 rounded-lg p-1">
                      <button
                        onClick={() => setAuditFilter('passed')}
                        className={`px-3 py-1 text-sm rounded-full transition-colors ${
                          auditFilter === 'passed'
                            ? 'bg-green-500 text-white'
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        Passed
                      </button>
                      <button
                        onClick={() => setAuditFilter('failed')}
                        className={`px-3 py-1 text-sm rounded-full transition-colors ${
                          auditFilter === 'failed'
                            ? 'bg-red-500 text-white'
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        Failed
                      </button>
                    </div>
                    <button
                      onClick={() => setShowAllAudits(!showAllAudits)}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      {showAllAudits ? 'Show Less' : 'View All'}
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  {(showAllAudits ? filteredAudits : filteredAudits.slice(0, 4)).map((audit) => {
                    const date = new Date(audit.createdAt);
                    const formattedDate = new Intl.DateTimeFormat('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: 'numeric'
                    }).format(date);

                    return (
                      <div
                        key={`${audit.id}-${audit.createdAt}-${audit.group?.id}`}
                        className="group flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-all duration-200"
                      >
                        <div className="flex items-center min-w-0">
                          <div className={`w-8 h-8 rounded-lg ${audit.grade >= 1 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'} flex items-center justify-center flex-shrink-0`}>
                            {audit.grade >= 1 ? (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                              </svg>
                            ) : (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            )}
                          </div>
                          <div className="ml-3 min-w-0">
                            <div className="flex items-center space-x-1">
                              <p className="text-sm font-medium text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                                Audited
                              </p>
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {audit.group?.object?.name || 'Unknown Project'}
                              </p>
                            </div>
                            <div className="flex items-center mt-1 space-x-2">
                              <span className="text-xs text-gray-500">{formattedDate}</span>
                              <span className="text-xs font-medium text-gray-500">•</span>
                              <span className="text-xs text-gray-500">
                                by {audit.group?.captainLogin || 'Unknown User'}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="ml-4">
                          <button
                            onClick={() => window.open(`https://learn.reboot01.com/intra/bahrain/bh-module${audit.path.replace('/bahrain/bh-module', '')}?event=20`, '_blank')}
                            className="ml-4 p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-200 transition-all duration-200"
                            title="View Audit"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-base font-semibold text-gray-900">Recent Activity</h3>
                  <button 
                    onClick={() => setShowAllActivity(!showAllActivity)}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    {showAllActivity ? 'Show Less' : 'View All'}
                  </button>
                </div>

                <div className="space-y-4">
                  {displayedTransactions.map((transaction) => (
                    <div
                      key={transaction.path}
                      className="flex items-center justify-between p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                          </svg>
                        </div>
                        <div>
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                              {formatTransactionName(transaction.path)}
                            </p>
                            <span className="ml-2 flex-shrink-0 text-sm text-gray-500">
                              {new Date(transaction.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="flex items-center mt-1">
                            <span className="text-xs font-medium text-green-600 bg-green-100 px-2 py-0.5 rounded-full">
                              +{transaction.amount?.toLocaleString()}
                            </span>
                            {transaction.path && (
                              <span className="ml-2 text-xs text-gray-500 truncate">
                                {transaction.path.replace('/bahrain/bh-module', '').split('/').filter(Boolean).slice(0, -1).join('/')}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => window.open(`https://learn.reboot01.com${transaction.path}`, '_blank')}
                        className="ml-4 p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-200 transition-all duration-200"
                        title="View Transaction"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
