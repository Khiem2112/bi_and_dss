// Ham chuyen doi khoang cach thanh ma nhom cu ly BTS (G01 den G11)
export const getDistanceGroup = (distance) => {
  const group = Math.min(11, Math.max(1, Math.floor(distance / 250) + 1));
  return `G${String(group).padStart(2, '0')}`;
};

// Xay dung menh de WHERE cho bang tong hop mart_base
export const buildMartBaseWhere = (filters) => {
  if (!filters) return '1=1';

  const conditions = [];

  // Loc thoi gian theo thang nam YYYY-MM
  if (filters.fromDate) {
    const fromYm = filters.fromDate.slice(0, 7);
    conditions.push(`year_month >= '${fromYm}'`);
  }
  if (filters.toDate) {
    const toYm = filters.toDate.slice(0, 7);
    conditions.push(`year_month <= '${toYm}'`);
  }

  // Loc theo mua
  if (Array.isArray(filters.season) && filters.season.length > 0) {
    const escaped = filters.season.map((s) => `'${s.replace(/'/g, "''")}'`).join(', ');
    conditions.push(`season IN (${escaped})`);
  }

  // Loc theo thu trong tuan
  if (Array.isArray(filters.dayOfWeek) && filters.dayOfWeek.length > 0) {
    const days = filters.dayOfWeek.map((d) => Number(d)).filter((d) => !Number.isNaN(d));
    if (days.length > 0) {
      conditions.push(`day_of_week IN (${days.join(', ')})`);
    }
  }

  // Loc theo khung gio khoi hanh ke hoach
  if (Array.isArray(filters.scheduledTimeBlock) && filters.scheduledTimeBlock.length > 0) {
    const escaped = filters.scheduledTimeBlock.map((t) => `'${t.replace(/'/g, "''")}'`).join(', ');
    conditions.push(`time_block IN (${escaped})`);
  }

  // Loc theo nhom cu ly
  if (filters.distanceFilter) {
    const df = filters.distanceFilter;
    if (df.mode === 'groups' && Array.isArray(df.groups) && df.groups.length > 0) {
      const escaped = df.groups.map((g) => `'${g.replace(/'/g, "''")}'`).join(', ');
      conditions.push(`distance_group IN (${escaped})`);
    } else if (df.mode === 'range') {
      const minGroup = getDistanceGroup(df.minMiles || 0);
      const maxGroup = getDistanceGroup(df.maxMiles || 5000);
      conditions.push(`distance_group >= '${minGroup}' AND distance_group <= '${maxGroup}'`);
    }
  }

  // Loc theo menh de san bay (airportClauses)
  if (Array.isArray(filters.airportClauses) && filters.airportClauses.length > 0) {
    const clauseConditions = [];
    for (const clause of filters.airportClauses) {
      if (!clause) continue;
      if (clause.mode === 'route' && clause.origin && clause.destination) {
        clauseConditions.push(
          `(origin = '${clause.origin.replace(/'/g, "''")}' AND destination = '${clause.destination.replace(/'/g, "''")}')`
        );
      } else if (clause.mode === 'origin' && clause.airport) {
        clauseConditions.push(`origin = '${clause.airport.replace(/'/g, "''")}'`);
      } else if (clause.mode === 'destination' && clause.airport) {
        clauseConditions.push(`destination = '${clause.airport.replace(/'/g, "''")}'`);
      } else {
        const aps = (clause.airports && Array.isArray(clause.airports) && clause.airports.length > 0)
          ? clause.airports
          : clause.airport ? [clause.airport] : [];
        if (aps.length > 0) {
          const escaped = aps.map((a) => `'${a.replace(/'/g, "''")}'`).join(', ');
          clauseConditions.push(`(origin IN (${escaped}) OR destination IN (${escaped}))`);
        }
      }
    }
    if (clauseConditions.length > 0) {
      conditions.push(`(${clauseConditions.join(' OR ')})`);
    }
  }

  return conditions.length > 0 ? conditions.join(' AND ') : '1=1';
};

// Xay dung menh de WHERE cho bang chi tiet flights_cleaned
export const buildFlightsCleanedWhere = (filters, searchKeyword = '') => {
  const conditions = [];

  // Mac dinh chi xet chuyen bay hang WN theo pham vi nghien cuu
  conditions.push("carrier = 'WN'");

  if (filters) {
    if (filters.fromDate) {
      conditions.push(`flight_date >= '${filters.fromDate}'`);
    }
    if (filters.toDate) {
      conditions.push(`flight_date <= '${filters.toDate}'`);
    }
    if (Array.isArray(filters.season) && filters.season.length > 0) {
      const escaped = filters.season.map((s) => `'${s.replace(/'/g, "''")}'`).join(', ');
      conditions.push(`season IN (${escaped})`);
    }
    if (Array.isArray(filters.dayOfWeek) && filters.dayOfWeek.length > 0) {
      const days = filters.dayOfWeek.map((d) => Number(d)).filter((d) => !Number.isNaN(d));
      if (days.length > 0) {
        conditions.push(`day_of_week IN (${days.join(', ')})`);
      }
    }
    if (Array.isArray(filters.scheduledTimeBlock) && filters.scheduledTimeBlock.length > 0) {
      const escaped = filters.scheduledTimeBlock.map((t) => `'${t.replace(/'/g, "''")}'`).join(', ');
      conditions.push(`time_block IN (${escaped})`);
    }
    if (filters.distanceFilter) {
      const df = filters.distanceFilter;
      if (df.mode === 'groups' && Array.isArray(df.groups) && df.groups.length > 0) {
        const escaped = df.groups.map((g) => `'${g.replace(/'/g, "''")}'`).join(', ');
        conditions.push(`distance_group IN (${escaped})`);
      } else if (df.mode === 'range') {
        if (typeof df.minMiles === 'number') {
          conditions.push(`distance >= ${df.minMiles}`);
        }
        if (typeof df.maxMiles === 'number') {
          conditions.push(`distance <= ${df.maxMiles}`);
        }
      }
    }
    if (Array.isArray(filters.airportClauses) && filters.airportClauses.length > 0) {
      const clauseConditions = [];
      for (const clause of filters.airportClauses) {
        if (!clause) continue;
        if (clause.mode === 'route' && clause.origin && clause.destination) {
          clauseConditions.push(
            `(origin = '${clause.origin.replace(/'/g, "''")}' AND destination = '${clause.destination.replace(/'/g, "''")}')`
          );
        } else if (clause.mode === 'origin' && clause.airport) {
          clauseConditions.push(`origin = '${clause.airport.replace(/'/g, "''")}'`);
        } else if (clause.mode === 'destination' && clause.airport) {
          clauseConditions.push(`destination = '${clause.airport.replace(/'/g, "''")}'`);
        } else {
          const aps = (clause.airports && Array.isArray(clause.airports) && clause.airports.length > 0)
            ? clause.airports
            : clause.airport ? [clause.airport] : [];
          if (aps.length > 0) {
            const escaped = aps.map((a) => `'${a.replace(/'/g, "''")}'`).join(', ');
            clauseConditions.push(`(origin IN (${escaped}) OR destination IN (${escaped}))`);
          }
        }
      }
      if (clauseConditions.length > 0) {
        conditions.push(`(${clauseConditions.join(' OR ')})`);
      }
    }
  }

  // Bo loc tim kiem toan cot van ban tieng Viet khong dau / co dau
  if (searchKeyword && searchKeyword.trim().length > 0) {
    const kw = searchKeyword.trim().replace(/'/g, "''").toUpperCase();
    conditions.push(
      `(origin LIKE '%${kw}%' OR destination LIKE '%${kw}%' OR flight_number LIKE '%${kw}%' OR carrier LIKE '%${kw}%')`
    );
  }

  return conditions.length > 0 ? conditions.join(' AND ') : '1=1';
};

// Xay dung menh de WHERE cho bang fact_prediction
export const buildFactPredictionWhere = (predictionFilters, globalFilters, prefix = 'p.') => {
  const conditions = [];

  if (predictionFilters?.window) {
    if (predictionFilters.window.includes('2018-01-18') || predictionFilters.window.includes('20180118')) {
      conditions.push(`${prefix}DateKey = 20180118`);
    } else if (predictionFilters.window.includes('2018-02-07') || predictionFilters.window.includes('20180207')) {
      conditions.push(`${prefix}DateKey = 20180207`);
    }
  }

  if (predictionFilters?.timeBlock) {
    conditions.push(`${prefix}time_block = '${predictionFilters.timeBlock.replace(/'/g, "''")}'`);
  }

  if (predictionFilters?.route) {
    const cleanRoute = predictionFilters.route.replace(' → ', '_').replace(/'/g, "''");
    conditions.push(`(${prefix}route_key = '${cleanRoute}' OR ${prefix}origin || ' → ' || ${prefix}destination = '${predictionFilters.route.replace(/'/g, "''")}')`);
  }

  if (globalFilters) {
    if (Array.isArray(globalFilters.scheduledTimeBlock) && globalFilters.scheduledTimeBlock.length > 0 && !predictionFilters?.timeBlock) {
      const escaped = globalFilters.scheduledTimeBlock.map((t) => `'${t.replace(/'/g, "''")}'`).join(', ');
      conditions.push(`${prefix}time_block IN (${escaped})`);
    }

    if (Array.isArray(globalFilters.airportClauses) && globalFilters.airportClauses.length > 0) {
      const clauseConditions = [];
      for (const clause of globalFilters.airportClauses) {
        if (!clause) continue;
        if (clause.mode === 'route' && clause.origin && clause.destination) {
          clauseConditions.push(
            `(${prefix}origin = '${clause.origin.replace(/'/g, "''")}' AND ${prefix}destination = '${clause.destination.replace(/'/g, "''")}')`
          );
        } else if (clause.mode === 'origin' && clause.airport) {
          clauseConditions.push(`${prefix}origin = '${clause.airport.replace(/'/g, "''")}'`);
        } else if (clause.mode === 'destination' && clause.airport) {
          clauseConditions.push(`${prefix}destination = '${clause.airport.replace(/'/g, "''")}'`);
        } else {
          const aps = (clause.airports && Array.isArray(clause.airports) && clause.airports.length > 0)
            ? clause.airports
            : clause.airport ? [clause.airport] : [];
          if (aps.length > 0) {
            const escaped = aps.map((a) => `'${a.replace(/'/g, "''")}'`).join(', ');
            clauseConditions.push(`(${prefix}origin IN (${escaped}) OR ${prefix}destination IN (${escaped}))`);
          }
        }
      }
      if (clauseConditions.length > 0) {
        conditions.push(`(${clauseConditions.join(' OR ')})`);
      }
    }
  }

  return conditions.length > 0 ? conditions.join(' AND ') : '1=1';
};

