using System.Configuration;
using System.Data.SqlClient;

namespace MinCang
{
    public static class Db
    {
        public static SqlConnection Open()
        {
            var connection = new SqlConnection(
                ConfigurationManager.ConnectionStrings["MinjianCollections"].ConnectionString
            );
            connection.Open();
            return connection;
        }
    }
}
